import { useEffect } from 'react';
import WebApp from '@twa-dev/sdk';

export function useTelegramBackButton(onBack: () => void) {
  useEffect(() => {
    if (!WebApp.initData) return;

    WebApp.BackButton.show();
    const handler = () => onBack();
    WebApp.BackButton.onClick(handler);

    return () => {
      WebApp.BackButton.offClick(handler);
      WebApp.BackButton.hide();
    };
  }, [onBack]);
}
