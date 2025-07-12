import axios from 'axios';
import { AdminGenerationMenuItem } from '@/types';
import { keysToSnakeCase, keysToCamelCase } from '@/utils/caseConverter';

const API_BASE = `${process.env.AISHA_API_BASE}/menus`;

export const fetchMenus = async (
  onError?: (error: unknown) => void,
): Promise<AdminGenerationMenuItem[]> => {
  try {
    const response = await axios.get(API_BASE);
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('メニュー取得失敗', err);
    onError?.(err);
    return [];
  }
};

export const createMenu = async (
  menu: AdminGenerationMenuItem,
  onError?: (error: unknown) => void,
): Promise<AdminGenerationMenuItem | null> => {
  try {
    const response = await axios.post(`${API_BASE}/`, keysToSnakeCase(menu));
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('メニュー作成失敗', err);
    onError?.(err);
    return null;
  }
};

export const updateMenu = async (
  menu: AdminGenerationMenuItem,
  onError?: (error: unknown) => void,
): Promise<AdminGenerationMenuItem | null> => {
  try {
    const response = await axios.put(
      `${API_BASE}/${menu.id}/`,
      keysToSnakeCase(menu),
    );
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('メニュー更新失敗', err);
    onError?.(err);
    return null;
  }
};

export const deleteMenu = async (
  id: number,
  onError?: (error: unknown) => void,
): Promise<boolean> => {
  try {
    await axios.delete(`${API_BASE}/${id}/`);
    return true;
  } catch (err) {
    console.error('メニュー削除失敗', err);
    onError?.(err);
    return false;
  }
};
