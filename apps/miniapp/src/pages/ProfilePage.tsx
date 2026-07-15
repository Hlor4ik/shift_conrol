import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToken, useAuth } from '../lib/auth';
import { getTelegramUserName } from '../lib/telegram';
import { PageHeader } from '../components/ui/PageHeader';
import { AppFooter } from '../components/ui/Extras';
import { Skeleton } from '../components/ui/Skeleton';
import { QueryErrorBanner } from '../components/ui/QueryErrorBanner';
import { IconChevronRight, IconStar, IconWallet, IconBell, IconLogout, IconUser } from '../components/icons';

export default function ProfilePage() {
  const token = useToken();
  const { logout } = useAuth();
  const tgName = getTelegramUserName();

  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api<{
        workerProfile: {
          fullName: string;
          specialty: string;
          rating: number;
        } | null;
      }>('/auth/me', { token: token! }),
    enabled: !!token,
  });

  const profile = user?.workerProfile;
  const displayName = profile?.fullName ?? tgName ?? 'Пользователь';
  const specialty = profile?.specialty ?? 'Разнорабочий';
  const rating = profile?.rating ?? 100;
  const stars = Math.min(5, Math.max(0, Math.round(rating / 20)));

  if (isLoading) return <Skeleton className="h-56" />;

  if (isError) {
    return (
      <div className="page pt-2">
        <PageHeader title="Профиль" />
        <QueryErrorBanner onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="page pt-2">
      <PageHeader title="Профиль" />

      <div className="sc-card p-5">
        <div className="flex items-center gap-4">
          <div className="w-[68px] h-[68px] rounded-full bg-brand-600 text-white flex items-center justify-center text-[26px] font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-slate-900">{displayName}</h2>
            <p className="text-[13px] text-slate-500 mt-0.5">{specialty}</p>
            <div className="flex items-center gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <IconStar
                  key={i}
                  className={`w-4 h-4 ${i <= stars ? 'text-amber-400' : 'text-slate-200'}`}
                />
              ))}
              <span className="text-[14px] font-semibold text-slate-700 ml-1.5">
                {(rating / 20).toFixed(1)}
              </span>
              <span className="text-[12px] text-slate-400 ml-1">из 200</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <MenuLink to="/profile/settings" icon={<IconUser className="w-5 h-5" />} label="Настройки профиля" accent="blue" />
        <MenuLink to="/payments" icon={<IconWallet className="w-5 h-5" />} label="История выплат" accent="green" />
        <MenuLink to="/notifications" icon={<IconBell className="w-5 h-5" />} label="Уведомления" accent="amber" />
      </div>

      <button
        type="button"
        onClick={() => void logout()}
        className="w-full flex items-center justify-center gap-2 py-3 text-[15px] font-semibold text-red-500"
      >
        <IconLogout className="w-5 h-5" />
        Выйти из аккаунта
      </button>

      <AppFooter />
    </div>
  );
}

function MenuLink({
  to,
  icon,
  label,
  accent,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  accent: 'green' | 'amber' | 'blue';
}) {
  const accents = {
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-brand-600',
  };

  return (
    <Link to={to} className="sc-card flex items-center justify-between p-4 active:scale-[0.99] transition-transform">
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-full flex items-center justify-center ${accents[accent]}`}>
          {icon}
        </span>
        <span className="font-semibold text-[15px] text-slate-900">{label}</span>
      </div>
      <IconChevronRight className="w-5 h-5 text-slate-400" />
    </Link>
  );
}
