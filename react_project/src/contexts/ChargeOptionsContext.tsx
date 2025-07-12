import { createContext, useContext, useEffect, useState } from 'react';
import { fetchChargeOptions } from '@/services/api/charge-options';
import { AdminChargeOptionItem } from '@/types';
import { useToast } from './ToastContext';

interface ChargeOptionsContextValue {
  options: AdminChargeOptionItem[] | null;
  refresh: () => void;
}

const ChargeOptionsContext = createContext<ChargeOptionsContextValue | null>(null);

export const useChargeOptions = () => {
  const ctx = useContext(ChargeOptionsContext);
  if (!ctx) throw new Error('useChargeOptions must be used within ChargeOptionsProvider');
  return ctx.options;
};

export const useChargeOptionsActions = () => {
  const ctx = useContext(ChargeOptionsContext);
  if (!ctx) throw new Error('useChargeOptionsActions must be used within ChargeOptionsProvider');
  return { refreshChargeOptions: ctx.refresh };
};

export const ChargeOptionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [options, setOptions] = useState<AdminChargeOptionItem[] | null>(null);
  const { showToast } = useToast();

  const load = () => {
    fetchChargeOptions(() => {
      showToast('error', 'チャージオプションの取得に失敗しました');
    }).then(setOptions);
  };

  useEffect(() => { load(); }, []);

  return (
    <ChargeOptionsContext.Provider value={{ options, refresh: load }}>
      {children}
    </ChargeOptionsContext.Provider>
  );
};