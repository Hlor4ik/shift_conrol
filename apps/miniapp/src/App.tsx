import { useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import ShiftsPage from './pages/ShiftsPage';
import ShiftDetailPage from './pages/ShiftDetailPage';
import MyShiftsPage from './pages/MyShiftsPage';
import PaymentsPage from './pages/PaymentsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import CheckInPage from './pages/CheckInPage';
import clsx from 'clsx';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const nav = [
    { to: '/', label: 'Главная' },
    { to: '/shifts', label: 'Смены' },
    { to: '/my-shifts', label: 'Мои' },
    { to: '/profile', label: 'Профиль' },
  ];

  return (
    <div className="min-h-screen pb-20">
      <main className="px-4 py-4 max-w-lg mx-auto">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 safe-area-bottom">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={clsx(
              'text-sm px-3 py-2 rounded-lg',
              location.pathname === item.to
                ? 'text-tg-button font-semibold'
                : 'text-tg-hint',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const { token, needsRegistration, isLoading, login } = useAuth();

  useEffect(() => {
    if (!token) login();
  }, [token, login]);

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-tg-hint">Загрузка...</div>
      </div>
    );
  }

  if (needsRegistration) {
    return <RegisterPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/shifts/:id" element={<ShiftDetailPage />} />
        <Route path="/my-shifts" element={<MyShiftsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/checkin/:shiftId" element={<CheckInPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
