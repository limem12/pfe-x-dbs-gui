'use client';

import { useStore } from '@/lib/store-api';
import LoginPage from '@/components/login-page';
import MainApp from '@/components/main-app';
import { useTranslation } from '@/lib/useTranslation';

export default function Home() {
  const { currentUser, hasHydratedAuth } = useStore();
  const { t } = useTranslation();

  if (!hasHydratedAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 to-purple-100 dark:from-slate-950 dark:to-purple-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-violet-600 dark:text-violet-400 font-medium">{t("login", "loading")}</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return <MainApp />;
}
