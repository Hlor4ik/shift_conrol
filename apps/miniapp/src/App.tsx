import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import WebApp from '@twa-dev/sdk';
import { useAuth, isAccessTokenExpired } from './lib/auth';
import { api } from './lib/api';
import { BottomNav } from './components/layout/BottomNav';
import { LoadingScreen } from './components/ui/Skeleton';
import { AccountStatusBanner } from './components/ui/AccountStatusBanner';
import OpenInTelegramPage from './pages/OpenInTelegramPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import ShiftsPage from './pages/ShiftsPage';
import ShiftDetailPage from './pages/ShiftDetailPage';
import MyShiftsPage from './pages/MyShiftsPage';
import PaymentsPage from './pages/PaymentsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import CheckInPage from './pages/CheckInPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import { Button } from './components/ui/Button';

function Layout({ children, showNav, token }: { children: React.ReactNode; showNav: boolean; token: string }) {
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ status: string }>('/auth/me', { token }),
    enabled: !!token,
  });

  const accountStatus =
    user?.status === 'BLOCKED' || user?.status === 'PENDING_VERIFICATION'
      ? (user.status as 'BLOCKED' | 'PENDING_VERIFICATION')
      : null;

  return (
    <div className={`min-h-[100dvh] bg-[#f4f6fb] ${showNav ? 'pb-24' : 'pb-6'}`}>
      <main className="px-4 pt-0 max-w-lg mx-auto">
        {accountStatus && <AccountStatusBanner status={accountStatus} />}
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}

function AuthErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-[#f4f6fb]">
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center text-2xl mb-4">
        !
      </div>
      <h1 className="text-lg font-bold text-slate-900">Не удалось войти</h1>
      <p className="text-sm text-slate-500 mt-2 max-w-xs">{message}</p>
      <Button fullWidth className="mt-6 max-w-sm" onClick={onRetry}>
        Попробовать снова
      </Button>
    </div>
  );
}

export default function App() {
  const { token, needsRegistration, isLoading, isOutsideTelegram, authError, loggedOut, login, clearError } =
    useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const deepLinkHandled = useRef(false);

  useEffect(() => {
    if (loggedOut || isOutsideTelegram || authError) return;
    const stored = localStorage.getItem('token');
    if (!stored || isAccessTokenExpired(stored)) {
      login();
    }
  }, [loggedOut, isOutsideTelegram, authError, login]);

  useEffect(() => {
    if (!token || needsRegistration || deepLinkHandled.current) return;
    const startParam = WebApp.initDataUnsafe.start_param;
    if (!startParam) return;

    deepLinkHandled.current = true;

    if (startParam.startsWith('checkin_')) {
      navigate(`/checkin/${startParam.slice(8)}`, { replace: true });
      return;
    }

    if (startParam.startsWith('shift_')) {
      navigate(`/shifts/${startParam.slice(6)}`, { replace: true });
      return;
    }

    if (startParam.startsWith('/')) {
      navigate(startParam, { replace: true });
      return;
    }

    navigate(`/shifts/${startParam}`, { replace: true });
  }, [token, needsRegistration, navigate]);

  const hideNav =
    /^\/shifts\/[^/]+$/.test(location.pathname) ||
    /^\/checkin\//.test(location.pathname) ||
    /^\/payments$/.test(location.pathname) ||
    /^\/notifications$/.test(location.pathname) ||
    /^\/profile\/settings$/.test(location.pathname);

  const showNav =
    !needsRegistration && !isOutsideTelegram && !authError && !hideNav;

  if (isOutsideTelegram || loggedOut) {
    return <OpenInTelegramPage />;
  }

  if (isLoading) {
    return <LoadingScreen message="Подключаемся к Telegram..." />;
  }

  if (authError) {
    return (
      <AuthErrorScreen
        message={authError}
        onRetry={() => {
          clearError();
          login();
        }}
      />
    );
  }

  if (!token) {
    return <LoadingScreen message="Подключаемся к Telegram..." />;
  }

  if (needsRegistration) {
    return <RegisterPage />;
  }

  return (
    <Layout showNav={showNav} token={token}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/shifts/:id" element={<ShiftDetailPage />} />
        <Route path="/my-shifts" element={<MyShiftsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/settings" element={<ProfileSettingsPage />} />
        <Route path="/checkin/:shiftId" element={<CheckInPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
