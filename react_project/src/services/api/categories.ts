import axios from 'axios';
import { AdminGenerationMenuCategoryItem } from '@/types';
import { keysToSnakeCase, keysToCamelCase } from '@/utils/caseConverter';

const API_BASE = `${process.env.AISHA_API_BASE}/categories`;

export const fetchCategories = async (
  onError?: (error: unknown) => void,
): Promise<AdminGenerationMenuCategoryItem[]> => {
  try {
    const response = await axios.get(API_BASE);
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('カテゴリ取得失敗', err);
    onError?.(err);
    return [];
  }
};

export const createCategory = async (
  category: AdminGenerationMenuCategoryItem,
  onError?: (error: unknown) => void,
): Promise<AdminGenerationMenuCategoryItem | null> => {
  try {
    const response = await axios.post(
      `${API_BASE}/`,
      keysToSnakeCase(category),
    );
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('カテゴリ作成失敗', err);
    onError?.(err);
    return null;
  }
};

export const updateCategory = async (
  category: AdminGenerationMenuCategoryItem,
  onError?: (error: unknown) => void,
): Promise<AdminGenerationMenuCategoryItem | null> => {
  try {
    const response = await axios.put(
      `${API_BASE}/${category.id}/`,
      keysToSnakeCase(category),
    );
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('カテゴリ更新失敗', err);
    onError?.(err);
    return null;
  }
};

export const deleteCategory = async (
  id: number,
  onError?: (error: unknown) => void,
): Promise<boolean> => {
  try {
    await axios.delete(`${API_BASE}/${id}/`);
    return true;
  } catch (err) {
    console.error('カテゴリ削除失敗', err);
    onError?.(err);
    return false;
  }
};
