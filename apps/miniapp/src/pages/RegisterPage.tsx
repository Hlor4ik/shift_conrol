import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth, useToken } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

const workerRegisterSchema = z.object({
  fullName: z.string().min(2).max(200),
  phone: z.string().min(10).max(20),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  city: z.string().min(2).max(100),
  specialty: z.string().min(2).max(100),
  experience: z.number().int().min(0).max(50),
  bankDetails: z
    .object({
      bankName: z.string().optional(),
      accountNumber: z.string().optional(),
      bik: z.string().optional(),
    })
    .optional(),
});

type FormData = z.infer<typeof workerRegisterSchema>;

export default function RegisterPage() {
  const token = useToken();
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(workerRegisterSchema),
    defaultValues: { experience: 0 },
  });

  const onSubmit = async (data: FormData) => {
    await api('/workers/register', {
      method: 'POST',
      token: token!,
      body: JSON.stringify(data),
    });
    useAuth.setState({ needsRegistration: false });
    navigate('/');
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Регистрация</h1>
      <p className="text-tg-hint mb-6">Заполните профиль для записи на смены</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="ФИО" error={errors.fullName?.message}>
          <input {...register('fullName')} className="input" placeholder="Иванов Иван Иванович" />
        </Field>
        <Field label="Телефон" error={errors.phone?.message}>
          <input {...register('phone')} className="input" placeholder="+79001234567" />
        </Field>
        <Field label="Дата рождения" error={errors.birthDate?.message}>
          <input {...register('birthDate')} type="date" className="input" />
        </Field>
        <Field label="Город" error={errors.city?.message}>
          <input {...register('city')} className="input" placeholder="Москва" />
        </Field>
        <Field label="Специальность" error={errors.specialty?.message}>
          <input {...register('specialty')} className="input" placeholder="Монтажник" />
        </Field>
        <Field label="Опыт (лет)" error={errors.experience?.message}>
          <input {...register('experience', { valueAsNumber: true })} type="number" className="input" />
        </Field>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-tg-button text-tg-buttonText py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {isSubmitting ? 'Сохранение...' : 'Зарегистрироваться'}
        </button>
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
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
