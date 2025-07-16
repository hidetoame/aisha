import { createContext, useContext, useEffect, useState } from 'react';
import { fetchCredits } from '../services/api/credits';
import { useToast } from './ToastContext';

interface CreditsContextValue {
  credits: number;
  refresh: (userId?: string) => void;
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

  const load = (userId?: string) => {
    console.log('🔍 CreditsContext.load called with userId:', userId);
    
    if (!userId) {
      console.warn('userId is not available for credits fetch');
      setCredits(0);
      return;
    }

    fetchCredits(userId, () => {
      showToast('error', 'クレジットの取得に失敗しました');
    })
      .then((res) => {
        console.log('💰 Credits API response:', res);
        // res: { credits: number } を想定し、numberのみを抜き出す
        setCredits(res?.credits ?? 0);
      })
      .catch((error) => {
        console.error('💥 Credits fetch error:', error);
        setCredits(0); // 失敗時は0を設定
      });
  };

  // useEffect(() => {
  //   load();
  // }, []);
  // 初期化時の自動読み込みは削除 - 明示的にuserIdが渡された時のみ読み込む

  return (
    <CreditsContext.Provider value={{ credits, refresh: load }}>
      {children}
    </CreditsContext.Provider>
  );
};
