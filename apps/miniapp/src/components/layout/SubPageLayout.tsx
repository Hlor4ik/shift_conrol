import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTopBar } from '../ui/PageHeader';
import { useTelegramBackButton } from '../../hooks/useTelegramBackButton';

export function SubPageLayout({
  title,
  children,
}: {
  title: string;
  backTo?: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const goBack = () => navigate(-1);
  useTelegramBackButton(goBack);

  return (
    <div className="page pt-2 -mx-4">
      <PageTopBar onBack={goBack} title={title} />
      <div className="px-4 space-y-4">{children}</div>
    </div>
  );
}
