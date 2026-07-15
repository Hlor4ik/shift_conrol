import WebApp from '@twa-dev/sdk';

const BRAND = {
  bg: '#f4f6fb',
  secondary: '#ffffff',
  text: '#0f172a',
  hint: '#64748b',
  button: '#2563eb',
  buttonText: '#ffffff',
  link: '#2563eb',
  header: '#1d4ed8',
} as const;

function applyFixedTheme() {
  const root = document.documentElement.style;
  root.setProperty('--tg-theme-bg-color', BRAND.bg);
  root.setProperty('--tg-theme-secondary-bg-color', BRAND.secondary);
  root.setProperty('--tg-theme-section-bg-color', BRAND.secondary);
  root.setProperty('--tg-theme-text-color', BRAND.text);
  root.setProperty('--tg-theme-hint-color', BRAND.hint);
  root.setProperty('--tg-theme-button-color', BRAND.button);
  root.setProperty('--tg-theme-button-text-color', BRAND.buttonText);
  root.setProperty('--tg-theme-link-color', BRAND.link);
  root.setProperty('--tg-theme-accent-text-color', BRAND.link);
}

export function initTelegramApp() {
  WebApp.ready();
  WebApp.expand();
  applyFixedTheme();
  WebApp.setHeaderColor(BRAND.header);
  WebApp.setBackgroundColor(BRAND.bg);
}

export function isInsideTelegram(): boolean {
  return Boolean(WebApp.initData?.length);
}

export function getTelegramUserName(): string | null {
  const user = WebApp.initDataUnsafe.user;
  if (!user?.first_name) return null;
  return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name;
}

export function getBotUsername(): string {
  return import.meta.env.VITE_BOT_USERNAME ?? 'shiftcontrol_ru_bot';
}

export function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (WebApp.initData && typeof WebApp.showConfirm === 'function') {
      WebApp.showConfirm(message, resolve);
      return;
    }
    resolve(window.confirm(message));
  });
}
