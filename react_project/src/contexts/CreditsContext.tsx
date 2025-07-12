import { createContext, useContext, useEffect, useState } from 'react';
import { fetchCredits } from '@/services/api/credits';
import { useToast } from './ToastContext';

interface CreditsContextValue {
  credits: number;
  refresh: () => void;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

export const useCredits = () => {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider');
  return ctx.credits;
};

export const useCreditsActions = () => {
  const ctx = useContext(CreditsContext);
  if (!ctx)
    throw new Error('useCreditsActions must be used within CreditsProvider');
  return { refreshCredits: ctx.refresh };
};

export const CreditsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [credits, setCredits] = useState<number>(0);

  const { showToast } = useToast();

  const load = () => {
    fetchCredits(() => {
      showToast('error', 'クレジットの取得に失敗しました');
    })
      .then((res) => {
        // res: { credits: number } を想定し、numberのみを抜き出す
        setCredits(res?.credits ?? 0);
      })
      .catch(() => {
        setCredits(0); // 失敗時は0を設定
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <CreditsContext.Provider value={{ credits, refresh: load }}>
      {children}
    </CreditsContext.Provider>
  );
};
