import { getBotUsername } from '../lib/telegram';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';

export default function OpenInTelegramPage() {
  const bot = getBotUsername();
  const botUrl = `https://t.me/${bot}`;
  const { loggedOut } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center bg-[#f4f6fb]">
      <div className="hero-banner rounded-3xl p-8 w-full max-w-sm mb-6 text-white shadow-glow">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 text-3xl">
          📱
        </div>
        <h1 className="text-2xl font-bold">ShiftControl</h1>
        <p className="text-sm text-white/80 mt-2">Приложение работает только внутри Telegram</p>
      </div>

      <p className="text-sm text-slate-600 max-w-xs leading-relaxed">
        Откройте бота, нажмите «Start» и запустите мини-приложение через кнопку в чате.
      </p>

      <Button
        fullWidth
        className="mt-8 max-w-sm"
        onClick={() => {
          window.open(botUrl, '_blank');
        }}
      >
        Открыть @{bot}
      </Button>

      <p className="text-xs text-slate-400 mt-6">
        В обычном браузере авторизация через Telegram недоступна
      </p>

      {loggedOut && (
        <p className="text-sm text-slate-500 mt-4 max-w-xs leading-relaxed">
          Вы вышли из аккаунта. Откройте бота заново, чтобы войти снова.
        </p>
      )}
    </div>
  );
}
