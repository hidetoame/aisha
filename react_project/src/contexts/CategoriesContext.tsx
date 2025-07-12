import { createContext, useContext, useEffect, useState } from 'react';
import { fetchCategories } from '@/services/api/categories';
import { AdminGenerationMenuCategoryItem } from '@/types';
import { useToast } from './ToastContext';

interface CategoriesContextValue {
  categories: AdminGenerationMenuCategoryItem[];
  refresh: () => void;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export const useCategories = () => {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories must be used within CategoriesProvider');
  return ctx.categories;
};

export const useCategoriesActions = () => {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategoriesActions must be used within CategoriesProvider');
  return { refreshCategories: ctx.refresh };
};

export const CategoriesProvider = ({ children }: { children: React.ReactNode }) => {
  const [categories, setCategories] = useState<AdminGenerationMenuCategoryItem[]>([]);

  const { showToast } = useToast();

  const load = () => {
    fetchCategories(() => {
      showToast('error', 'カテゴリの取得に失敗しました');
    })
      .then(setCategories)
      .catch(() => {
        setCategories([]); // 失敗時も [] を設定
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <CategoriesContext.Provider value={{ categories, refresh: load }}>
      {children}
    </CategoriesContext.Provider>
  );
};
