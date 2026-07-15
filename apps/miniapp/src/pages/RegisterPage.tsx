import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from '../lib/zodRussian';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth, useToken } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { IconHelmet } from '../components/icons';

const workerRegisterSchema = z.object({
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

type FormData = z.infer<typeof workerRegisterSchema>;

export default function RegisterPage() {
  const token = useToken();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(workerRegisterSchema),
    defaultValues: { experience: 0 },
  });

  const onSubmit = async (data: FormData) => {
    setSubmitError('');
    try {
      const { bankName, accountNumber, bik, ...rest } = data;
      const payload = {
        ...rest,
        bankDetails:
          bankName || accountNumber || bik ? { bankName, accountNumber, bik } : undefined,
      };
      await api('/workers/register', {
        method: 'POST',
        token: token!,
        body: JSON.stringify(payload),
      });
      useAuth.setState({ needsRegistration: false });
      navigate('/');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться');
    }
  };

  return (
    <div className="min-h-[100dvh] px-4 py-6 max-w-lg mx-auto pb-10 bg-[#f4f6fb]">
      <div className="hero-banner rounded-[20px] p-5 mb-6 text-white">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
          <IconHelmet className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Регистрация</h1>
        <p className="text-sm text-white/80 mt-2">Заполните профиль, чтобы записываться на смены</p>
        <div className="flex gap-2 mt-4">
          {['Профиль', 'Работа', 'Выплаты'].map((s, i) => (
            <span
              key={s}
              className={`text-xs px-3 py-1 rounded-full ${i === 0 ? 'bg-white text-brand-600 font-medium' : 'bg-white/20 text-white/90'}`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <section className="sc-card p-4 space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Личные данные</p>
          <Field label="ФИО" error={errors.fullName?.message}>
            <input {...register('fullName')} className="input" placeholder="Иванов Иван Иванович" />
          </Field>
          <Field label="Телефон" error={errors.phone?.message}>
            <input {...register('phone')} className="input" placeholder="+79001234567" />
          </Field>
          <Field label="Дата рождения" error={errors.birthDate?.message}>
            <input {...register('birthDate')} type="date" className="input" />
          </Field>
        </section>

        <section className="sc-card p-4 space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Работа</p>
          <Field label="Город" error={errors.city?.message}>
            <input {...register('city')} className="input" placeholder="Москва" />
          </Field>
          <Field label="Специальность" error={errors.specialty?.message}>
            <input {...register('specialty')} className="input" placeholder="Монтажник" />
          </Field>
          <Field label="Опыт (лет)" error={errors.experience?.message}>
            <input {...register('experience', { valueAsNumber: true })} type="number" className="input" min={0} />
          </Field>
        </section>

        <section className="sc-card p-4 space-y-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
            Реквизиты для выплат <span className="normal-case font-normal text-slate-500">(необязательно)</span>
          </p>
          <Field label="Банк">
            <input {...register('bankName')} className="input" placeholder="Сбербанк" />
          </Field>
          <Field label="Номер счёта">
            <input {...register('accountNumber')} className="input" placeholder="40817..." />
          </Field>
          <Field label="БИК">
            <input {...register('bik')} className="input" placeholder="044525225" />
          </Field>
        </section>

        {submitError && (
          <div className="sc-card p-4 border-red-200 bg-red-50">
            <p className="text-red-600 text-[13px] text-center">{submitError}</p>
          </div>
        )}

        <Button type="submit" fullWidth loading={isSubmitting}>
          {isSubmitting ? 'Сохранение...' : 'Зарегистрироваться'}
        </Button>
      </form>
    </div>
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
