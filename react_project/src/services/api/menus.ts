import axios from 'axios';
import { AdminGenerationMenuItem } from '@/types';
import { keysToSnakeCase, keysToCamelCase } from '@/utils/caseConverter';

const API_BASE = `${import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api'}/menus`;

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

export const updateMenuOrder = async (
  menuOrders: { id: number; display_order: number }[],
  onError?: (error: unknown) => void,
): Promise<boolean> => {
  try {
    const response = await axios.post(`${API_BASE}/update_order/`, {
      menu_orders: menuOrders,
    });
    console.log('メニュー順序更新成功:', response.data);
    return true;
  } catch (err) {
    console.error('メニュー順序更新失敗', err);
    onError?.(err);
    return false;
  }
};
