import axios from 'axios';
import { AdminChargeOptionItem } from '@/types';
import { keysToSnakeCase, keysToCamelCase } from '@/utils/caseConverter';

const API_BASE = `${process.env.MOCK_API_BASE}/charge-options`;

export const fetchChargeOptions = async (
  onError?: (error: unknown) => void,
): Promise<AdminChargeOptionItem[]> => {
  try {
    const response = await axios.get(API_BASE);
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('チャージオプション取得失敗', err);
    onError?.(err);
    return [];
  }
};

export const createChargeOption = async (
  chargeOption: AdminChargeOptionItem,
  onError?: (error: unknown) => void,
): Promise<AdminChargeOptionItem | null> => {
  try {
    const response = await axios.post(
      `${API_BASE}/`,
      keysToSnakeCase(chargeOption),
    );
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('チャージオプション作成失敗', err);
    onError?.(err);
    return null;
  }
};

export const updateChargeOption = async (
  chargeOption: AdminChargeOptionItem,
  onError?: (error: unknown) => void,
): Promise<AdminChargeOptionItem | null> => {
  try {
    const response = await axios.put(
      `${API_BASE}/${chargeOption.id}/`,
      keysToSnakeCase(chargeOption),
    );
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('チャージオプション更新失敗', err);
    onError?.(err);
    return null;
  }
};

export const deleteChargeOption = async (
  id: number,
  onError?: (error: unknown) => void,
): Promise<boolean> => {
  try {
    await axios.delete(`${API_BASE}/${id}/`);
    return true;
  } catch (err) {
    console.error('チャージオプション削除失敗', err);
    onError?.(err);
    return false;
  }
};
