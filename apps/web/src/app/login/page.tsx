'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { accessToken } = await api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const user = await api<{
        id: string;
        email: string;
        role: string;
        companyId?: string;
        company?: { id: string; name: string };
        managerProfile?: { fullName: string };
        foremanProfile?: { fullName: string };
      }>('/auth/me', { token: accessToken });
      setAuth(accessToken, user);
      if (user.role === 'WORKER') {
        setError('Работники используют Telegram Mini App, не админ-панель');
        useAuthStore.getState().logout();
        return;
      }
      if (user.role === 'SUPERADMIN') {
        try {
          const companies = await api<{ items: { id: string }[] }>('/companies', {
            token: accessToken,
          });
          if (companies.items[0]) {
            useAuthStore.getState().setCompanyId(companies.items[0].id);
          }
        } catch {
          // superadmin can pick company in header
        }
      }
      if (user.role === 'FOREMAN') router.push('/foreman/shifts');
      else if (user.role === 'MANAGER' || user.role === 'SUPERADMIN') router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">ShiftControl</h1>
          <p className="text-gray-500 mt-1">Панель управления сменами</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
