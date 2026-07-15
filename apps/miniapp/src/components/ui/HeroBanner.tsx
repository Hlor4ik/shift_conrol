import { Link } from 'react-router-dom';
import { IconBell } from '../icons';

interface HeroBannerProps {
  title: string;
  subtitle?: string;
  unread?: number;
}

export function HeroBanner({ title, subtitle, unread = 0 }: HeroBannerProps) {
  return (
    <header className="hero-banner px-4 pt-3 pb-12">
      <div className="max-w-lg mx-auto flex justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="text-[14px] text-white/85 mt-1.5 font-medium">{subtitle}</p>}
        </div>
        <Link
          to="/notifications"
          className="relative w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0"
        >
          <IconBell className="w-5 h-5 text-white" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-brand-600">
              {unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
