interface AccountStatusBannerProps {
  status: 'BLOCKED' | 'PENDING_VERIFICATION';
}

const messages: Record<AccountStatusBannerProps['status'], string> = {
  BLOCKED: 'Ваш аккаунт заблокирован. Обратитесь к администратору для разблокировки.',
  PENDING_VERIFICATION:
    'Аккаунт на проверке. Загрузите документ в настройках профиля и дождитесь подтверждения — без этого запись на смены недоступна.',
};

export function AccountStatusBanner({ status }: AccountStatusBannerProps) {
  return (
    <div className="sc-card p-4 border-amber-200 bg-amber-50 -mx-4 px-4 mb-4 rounded-none border-x-0">
      <p className="text-[14px] text-amber-900 font-medium">{messages[status]}</p>
    </div>
  );
}
