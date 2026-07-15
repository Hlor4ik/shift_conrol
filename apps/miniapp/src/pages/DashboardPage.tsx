import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';
import { getTelegramUserName } from '../lib/telegram';
import { useRefetchOnVisible } from '../hooks/useRefetchOnVisible';
import { formatMoney } from '../lib/format';
import { HeroBanner } from '../components/ui/HeroBanner';
import { StatCard } from '../components/ui/StatCard';
import { UpcomingShiftCard } from '../components/ui/UpcomingShiftCard';
import { SectionTitle } from '../components/ui/SectionTitle';
import { SkeletonList } from '../components/ui/Skeleton';
import { QueryErrorBanner } from '../components/ui/QueryErrorBanner';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { IconStar, IconBriefcase, IconWallet, IconShift } from '../components/icons';

interface Dashboard {
  rating: number;
  totalShifts: number;
  totalEarnings: string;
  unreadNotifications: number;
  nextShift: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime?: string;
    address: string;
    cost: string;
  } | null;
}

export default function DashboardPage() {
  const token = useToken();
  const userName = getTelegramUserName();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Dashboard>('/workers/me/dashboard', { token: token! }),
    enabled: !!token,
  });

  useRefetchOnVisible(refetch);

  if (isLoading) return <SkeletonList count={4} height="h-24" />;

  if (isError) {
    return (
      <div className="page pt-2 px-4">
        <QueryErrorBanner onRetry={() => refetch()} />
      </div>
    );
  }

  const firstName = userName?.split(' ')[0] ?? 'друг';
  const rating = data?.rating ?? 100;

  return (
    <div className="animate-slide-up -mx-4">
      <HeroBanner
        title={`Привет, ${firstName}!`}
        subtitle="Управляйте сменами и выплатами"
        unread={data?.unreadNotifications ?? 0}
      />

      <div className="px-4 -mt-7 space-y-5 relative z-10">
        <div className="flex justify-end -mb-2">
          <Button variant="ghost" className="!py-2 !px-3 text-sm" onClick={() => refetch()}>
            Обновить
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Рейтинг"
            value={String(rating)}
            hint="из 200"
            icon={<IconStar className="w-5 h-5" />}
            accent="amber"
          />
          <StatCard
            label="Смен"
            value={String(data?.totalShifts ?? 0)}
            icon={<IconBriefcase className="w-5 h-5" />}
            accent="blue"
          />
        </div>

        <StatCard
          label="Заработок"
          value={formatMoney(data?.totalEarnings ?? 0)}
          icon={<IconWallet className="w-5 h-5" />}
          accent="green"
          wide
        />

        <div className="space-y-3">
          <SectionTitle>Ближайшая смена</SectionTitle>
          {data?.nextShift ? (
            <UpcomingShiftCard
              {...data.nextShift}
              onCheckIn={() => navigate(`/checkin/${data.nextShift!.id}`)}
            />
          ) : (
            <div className="sc-card">
              <EmptyState
                icon={<IconShift className="w-7 h-7" />}
                title="Нет предстоящих смен"
                description="Запишитесь на смену — она появится здесь"
                actionLabel="Найти смену"
                onAction={() => navigate('/shifts')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
