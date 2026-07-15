import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '../lib/zodRussian';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, apiFormData } from '../lib/api';
import { useToken } from '../lib/auth';
import { SubPageLayout } from '../components/layout/SubPageLayout';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { QueryErrorBanner } from '../components/ui/QueryErrorBanner';
import { getDocumentStatusLabel } from '@shiftcontrol/shared';

const profileSchema = z.object({
  fullName: z.string().min(2).max(200),
  phone: z.string().min(10).max(20),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().min(2).max(100),
  specialty: z.string().min(2).max(100),
  experience: z.number().int().min(0).max(50),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  bik: z.string().optional(),
});

type FormData = z.infer<typeof profileSchema>;

interface WorkerProfile {
  fullName: string;
  phone: string;
  birthDate: string;
  city: string;
  specialty: string;
  experience: number;
  documentPhotoUrl?: string | null;
  bankDetails?: { bankName?: string; accountNumber?: string; bik?: string } | null;
}

interface VerificationInfo {
  status: string;
  verifiedAt?: string | null;
  verifiedByName?: string | null;
  document?: {
    status: string;
    rejectReason?: string | null;
    createdAt: string;
  } | null;
}

export default function ProfileSettingsPage() {
  const token = useToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['worker-me'],
    queryFn: () =>
      api<{ workerProfile: WorkerProfile; verification: VerificationInfo; status: string }>(
        '/workers/me',
        { token: token! },
      ),
    enabled: !!token,
  });

  const profile = data?.workerProfile;
  const verification = data?.verification;

  const birthDateValue = profile?.birthDate ? String(profile.birthDate).slice(0, 10) : '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          fullName: profile.fullName,
          phone: profile.phone,
          birthDate: birthDateValue,
          city: profile.city,
          specialty: profile.specialty,
          experience: profile.experience,
          bankName: profile.bankDetails?.bankName ?? '',
          accountNumber: profile.bankDetails?.accountNumber ?? '',
          bik: profile.bankDetails?.bik ?? '',
        }
      : undefined,
  });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api('/workers/me', { method: 'PATCH', token: token!, body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worker-me'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      navigate('/profile');
    },
  });

  const uploadDocument = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiFormData<{ url: string }>('/files/workers/me/document', formData, { token: token! });
    },
    onSuccess: (result) => {
      setDocumentUrl(result.url);
      setUploadError('');
      queryClient.invalidateQueries({ queryKey: ['worker-me'] });
    },
    onError: (err: Error) => setUploadError(err.message),
  });

  const onSubmit = async (form: FormData) => {
    const { bankName, accountNumber, bik, ...rest } = form;
    await save.mutateAsync({
      ...rest,
      bankDetails:
        bankName || accountNumber || bik ? { bankName, accountNumber, bik } : undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadDocument.mutate(file);
    e.target.value = '';
  };

  if (isLoading) return <Skeleton className="h-72 mx-4" />;

  if (isError || !profile) {
    return (
      <SubPageLayout title="Настройки профиля">
        <QueryErrorBanner onRetry={() => refetch()} />
      </SubPageLayout>
    );
  }

  const currentDocumentUrl = documentUrl ?? profile.documentPhotoUrl;

  return (
    <SubPageLayout title="Настройки профиля">
      <p className="text-[13px] text-slate-500 -mt-1">Измените личные данные и реквизиты для выплат</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">
        <section className="sc-card p-4 space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Документ</p>
          {verification?.status === 'ACTIVE' ? (
            <p className="text-[13px] text-emerald-700 font-medium">
              ✓ Аккаунт подтверждён
              {verification.verifiedAt
                ? ` · ${new Date(verification.verifiedAt).toLocaleDateString('ru-RU')}`
                : ''}
            </p>
          ) : verification?.document?.status === 'PENDING' ? (
            <p className="text-[13px] text-amber-700 font-medium">
              Документ на проверке. Обычно это занимает до 24 часов.
            </p>
          ) : verification?.document?.status === 'REJECTED' ? (
            <div className="text-[13px] text-red-600 space-y-1">
              <p className="font-medium">Документ отклонён</p>
              {verification.document.rejectReason && (
                <p>{verification.document.rejectReason}</p>
              )}
              <p>Загрузите новый документ ниже.</p>
            </div>
          ) : (
            <p className="text-[13px] text-amber-700 font-medium">
              Загрузите фото паспорта или другого документа для подтверждения аккаунта.
            </p>
          )}
          {verification?.document && (
            <p className="text-[12px] text-slate-500">
              Статус: {getDocumentStatusLabel(verification.document.status)}
            </p>
          )}
          <p className="text-[13px] text-slate-500">Фото паспорта или другого удостоверяющего документ</p>
          {currentDocumentUrl && (
            <img
              src={currentDocumentUrl}
              alt="Документ"
              className="w-full max-h-40 object-cover rounded-[14px] border border-slate-100"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={uploadDocument.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {currentDocumentUrl ? 'Заменить документ' : 'Загрузить документ'}
          </Button>
          {uploadError && <p className="text-red-500 text-xs text-center">{uploadError}</p>}
        </section>

        <section className="sc-card p-4 space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Личные данные</p>
          <Field label="ФИО" error={errors.fullName?.message}>
            <input {...register('fullName')} className="input" />
          </Field>
          <Field label="Телефон" error={errors.phone?.message}>
            <input {...register('phone')} className="input" />
          </Field>
          <Field label="Дата рождения" error={errors.birthDate?.message}>
            <input {...register('birthDate')} type="date" className="input" />
          </Field>
        </section>

        <section className="sc-card p-4 space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Работа</p>
          <Field label="Город" error={errors.city?.message}>
            <input {...register('city')} className="input" />
          </Field>
          <Field label="Специальность" error={errors.specialty?.message}>
            <input {...register('specialty')} className="input" />
          </Field>
          <Field label="Опыт (лет)" error={errors.experience?.message}>
            <input {...register('experience', { valueAsNumber: true })} type="number" className="input" min={0} />
          </Field>
        </section>

        <section className="sc-card p-4 space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Реквизиты</p>
          <Field label="Банк">
            <input {...register('bankName')} className="input" />
          </Field>
          <Field label="Номер счёта">
            <input {...register('accountNumber')} className="input" />
          </Field>
          <Field label="БИК">
            <input {...register('bik')} className="input" />
          </Field>
        </section>

        {save.isError && (
          <p className="text-red-500 text-[13px] text-center">{(save.error as Error).message}</p>
        )}

        <Button type="submit" fullWidth loading={isSubmitting || save.isPending}>
          Сохранить изменения
        </Button>
      </form>
    </SubPageLayout>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
