import axios from 'axios';
import { AISHA_API_BASE } from '@/constants';

export interface MonthlySummary {
  year: number;
  month: number;
  month_label: string;
  success_count: number;
  success_credit_total: number;
  success_point_total: number;
  pending_count: number;
}

export interface MonthlyDetail {
  id: number;
  user_id: string;
  user_email: string;
  charge_amount: number;
  credit_amount: number;
  payment_status: string;
  status_text: string;
  created_at: string;
  created_date: string;
}

export interface MonthlyDetailParams {
  year: string;
  month: string;
  status?: 'succeeded' | 'pending';
}

/**
 * 月別集計を取得
 */
export const getMonthlySummary = async (): Promise<MonthlySummary[]> => {
  try {
    const response = await axios.get(`${AISHA_API_BASE}/sales/monthly-summary/`);
    return response.data;
  } catch (error) {
    console.error('月別集計取得エラー:', error);
    throw error;
  }
};

/**
 * 月別詳細を取得
 */
export const getMonthlyDetails = async (params: MonthlyDetailParams): Promise<MonthlyDetail[]> => {
  try {
    const queryParams = new URLSearchParams({
      year: params.year,
      month: params.month,
      ...(params.status && { status: params.status })
    });
    
    const response = await axios.get(`${AISHA_API_BASE}/sales/monthly-details/?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('月別詳細取得エラー:', error);
    throw error;
  }
}; 