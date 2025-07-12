import axios from 'axios';
import {
  CreditsRequestParams,
  CreditsOperationResponseParams,
  CreditsFetchParams,
} from '@/types';
import { keysToSnakeCase, keysToCamelCase } from '@/utils/caseConverter';

const API_BASE = `${process.env.MOCK_API_BASE}/credits`;

export const fetchCredits = async (
  onError?: (error: unknown) => void,
): Promise<CreditsFetchParams | null> => {
  try {
    const response = await axios.get(API_BASE);
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('クレジット取得失敗', err);
    onError?.(err);
    return null;
  }
};

export const chargeCredits = async (
  chargeOption: CreditsRequestParams,
  onError?: (error: unknown) => void,
): Promise<CreditsOperationResponseParams | null> => {
  try {
    const response = await axios.post(
      `${API_BASE}/charge/`,
      keysToSnakeCase(chargeOption),
    );
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('クレジットチャージ失敗', err);
    onError?.(err);
    return null;
  }
};

export const consumeCredits = async (
  chargeOption: CreditsRequestParams,
  onError?: (error: unknown) => void,
): Promise<CreditsOperationResponseParams | null> => {
  try {
    const response = await axios.post(
      `${API_BASE}/consume/`,
      keysToSnakeCase(chargeOption),
    );
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('クレジット消費失敗', err);
    onError?.(err);
    return null;
  }
};
