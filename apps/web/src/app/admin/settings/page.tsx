'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_RATING_RULES, RATING_RULE_LABELS } from '@shiftcontrol/shared';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { QueryErrorBanner } from '@/components/QueryErrorBanner';
import { useToast } from '@/components/Toast';

export default function SettingsPage() {
  const { token, companyId } = useAuthStore();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [editedRules, setEditedRules] = useState<Record<string, number>>({});

  const { data: rules, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rating-rules', companyId],
    queryFn: () =>
      api<Record<string, number>>('/admin/settings/rating-rules', {
        token: token!,
        companyId: companyId ?? undefined,
      }),
    enabled: !!token,
  });

  useEffect(() => {
    if (rules) setEditedRules(rules);
  }, [rules]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api('/admin/settings', {
        method: 'PATCH',
        token: token!,
        companyId: companyId ?? undefined,
        body: JSON.stringify({ key: 'rating_rules', value: editedRules }),
      }),
    onSuccess: () => {
      showToast('Настройки сохранены');
      queryClient.invalidateQueries({ queryKey: ['rating-rules', companyId] });
      queryClient.invalidateQueries({ queryKey: ['settings', companyId] });
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  });

  const ruleKeys = Object.keys(DEFAULT_RATING_RULES) as (keyof typeof DEFAULT_RATING_RULES)[];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Настройки</h1>

      {isError && (
        <QueryErrorBanner
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      <div className="card p-6 space-y-4">
        <h3 className="font-semibold">Правила рейтинга</h3>
        <p className="text-sm text-gray-500">
          Баллы, начисляемые или списываемые при различных событиях
        </p>

        {isLoading ? (
          <div className="animate-pulse h-32 bg-gray-100 rounded-lg" />
        ) : (
          <div className="space-y-3">
            {ruleKeys.map((key) => (
              <div key={key} className="flex justify-between items-center gap-4">
                <span className="text-sm">{RATING_RULE_LABELS[key] ?? key}</span>
                <input
                  type="number"
                  className="input-field w-24 text-right font-mono"
                  value={editedRules[key] ?? rules?.[key] ?? DEFAULT_RATING_RULES[key]}
                  onChange={(e) =>
                    setEditedRules((prev) => ({
                      ...prev,
                      [key]: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        {saveMutation.isError && (
          <QueryErrorBanner
            message={
              saveMutation.error instanceof Error
                ? saveMutation.error.message
                : 'Не удалось сохранить'
            }
          />
        )}

        {saveMutation.isSuccess && (
          <p className="text-sm text-green-700">Настройки сохранены</p>
        )}

        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || isLoading}
          className="btn-primary"
        >
          {saveMutation.isPending ? 'Сохранение...' : 'Сохранить правила'}
        </button>
      </div>
    </div>
  );
}
