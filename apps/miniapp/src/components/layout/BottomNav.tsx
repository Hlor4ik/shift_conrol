import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { NavIcon } from '../icons';

const nav = [
  { to: '/', label: 'Главная' },
  { to: '/shifts', label: 'Смены' },
  { to: '/my-shifts', label: 'Мои' },
  { to: '/profile', label: 'Профиль' },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-nav safe-bottom">
      <div className="max-w-lg mx-auto flex justify-around px-1 pt-1.5 pb-1">
        {nav.map((item) => {
          const active =
            item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[4rem]"
            >
              <NavIcon to={item.to} active={active} />
              <span
                className={clsx(
                  'text-[11px] font-medium',
                  active ? 'text-brand-600' : 'text-slate-400',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
