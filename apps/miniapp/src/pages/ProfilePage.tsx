import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToken, useAuth } from '../lib/auth';

export default function ProfilePage() {
  const token = useToken();
  const { logout } = useAuth();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{
        workerProfile: {
          fullName: string;
          phone: string;
          city: string;
          specialty: string;
          experience: number;
          rating: number;
        };
      }>('/auth/me', { token: token! }),
    enabled: !!token && token !== 'dev',
  });

  const profile = user?.workerProfile;

  if (isLoading) return <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Профиль</h1>

      {profile && (
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <ProfileRow label="ФИО" value={profile.fullName} />
          <ProfileRow label="Телефон" value={profile.phone} />
          <ProfileRow label="Город" value={profile.city} />
          <ProfileRow label="Специальность" value={profile.specialty} />
          <ProfileRow label="Опыт" value={`${profile.experience} лет`} />
          <ProfileRow label="Рейтинг" value={`${profile.rating} ⭐`} />
        </div>
      )}

      <div className="space-y-2">
        <Link
          to="/payments"
          className="block bg-white rounded-xl p-4 shadow-sm font-medium"
        >
          История выплат →
        </Link>
        <Link
          to="/notifications"
          className="block bg-white rounded-xl p-4 shadow-sm font-medium"
        >
          Уведомления →
        </Link>
      </div>

      <button
        onClick={logout}
        className="w-full text-red-500 py-3 text-sm"
      >
        Выйти
      </button>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-tg-hint">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
