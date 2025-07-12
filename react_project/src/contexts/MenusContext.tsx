import { createContext, useContext, useEffect, useState } from 'react';
import { fetchMenus } from '@/services/api/menus';
import { AdminGenerationMenuItem } from '@/types';
import { useToast } from './ToastContext';

interface MenusContextValue {
  menus: AdminGenerationMenuItem[];
  refresh: () => void;
}

const MenusContext = createContext<MenusContextValue | null>(null);

export const useMenus = () => {
  const ctx = useContext(MenusContext);
  if (!ctx) throw new Error('useMenus must be used within MenusProvider');
  return ctx.menus;
};

export const useMenusActions = () => {
  const ctx = useContext(MenusContext);
  if (!ctx)
    throw new Error('useMenusActions must be used within MenusProvider');
  return { refreshMenus: ctx.refresh };
};

export const MenusProvider = ({ children }: { children: React.ReactNode }) => {
  const [menus, setMenus] = useState<AdminGenerationMenuItem[]>([]);

  const { showToast } = useToast();

  const load = () => {
    fetchMenus(() => {
      showToast('error', 'メニューの取得に失敗しました');
    })
      .then(setMenus)
      .catch(() => {
        setMenus([]); // 失敗時も []
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <MenusContext.Provider value={{ menus, refresh: load }}>
      {children}
    </MenusContext.Provider>
  );
};
