import { useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToken } from '../lib/auth';
import { useRefetchOnVisible } from '../hooks/useRefetchOnVisible';
import { SearchBar } from '../components/ui/SearchBar';
import { PageHeader } from '../components/ui/PageHeader';
import { ShiftCard, ShiftListItem } from '../components/ui/ShiftCard';
import { SkeletonList } from '../components/ui/Skeleton';
import { QueryErrorBanner } from '../components/ui/QueryErrorBanner';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { IconShift } from '../components/icons';

export default function ShiftsPage() {
  const token = useToken();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['shifts-available', city],
      queryFn: ({ pageParam = 1 }) => {
        const params = new URLSearchParams({
          page: String(pageParam),
          limit: '20',
        });
        if (city.trim()) params.set('city', city.trim());
        return api<{ items: ShiftListItem[]; total: number; page: number; limit: number }>(
          `/shifts/available?${params}`,
          { token: token! },
        );
      },
      initialPageParam: 1,
      getNextPageParam: (last) =>
        last.page * last.limit < last.total ? last.page + 1 : undefined,
      enabled: !!token,
    });

  useRefetchOnVisible(refetch);

  const allItems = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data?.pages]);

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.company.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q),
    );
  }, [allItems, search]);

  const total = data?.pages[0]?.total ?? 0;

  const resetFilters = () => {
    setSearch('');
    setCity('');
  };

  if (isLoading) return <SkeletonList count={4} />;

  if (isError) {
    return (
      <div className="page pt-2">
        <PageHeader title="Доступные смены" />
        <QueryErrorBanner onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="page pt-2">
      <div className="flex items-start justify-between gap-3">
        <PageHeader title="Доступные смены" subtitle={`${total} смен в каталоге`} />
        <Button variant="ghost" className="!py-2 !px-3 text-sm shrink-0" onClick={() => refetch()}>
          Обновить
        </Button>
      </div>

      <div className="space-y-2">
        <SearchBar
          value={search}
          onChange={setSearch}
          onFilter={resetFilters}
          filterLabel="Сбросить"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="input"
          placeholder="Фильтр по городу"
        />
      </div>

      <div className="space-y-3">
        {items.map((shift, i) => (
          <ShiftCard key={shift.id} shift={shift} index={i} />
        ))}

        {!items.length && (
          <div className="sc-card">
            <EmptyState
              icon={<IconShift className="w-7 h-7" />}
              title={search || city ? 'Ничего не найдено' : 'Смен пока нет'}
              description={
                search || city ? 'Попробуйте другой запрос' : 'Новые смены появятся здесь'
              }
              actionLabel={search || city ? 'Сбросить' : 'На главную'}
              onAction={search || city ? resetFilters : () => navigate('/')}
            />
          </div>
        )}

        {hasNextPage && !search && (
          <Button
            variant="secondary"
            fullWidth
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            Загрузить ещё
          </Button>
        )}
      </div>
    </div>
  );
}
