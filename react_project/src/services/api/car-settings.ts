import axios from 'axios';
import { CarSettings, CarSettingsCreateUpdateRequest, CarSettingsApiResponse } from '../../types';

const API_BASE = `${process.env.AISHA_API_BASE}/car-settings`;

/**
 * 愛車設定一覧取得
 */
export const fetchCarSettings = async (
  userId: string,
  carId?: string,
  onError?: (error: unknown) => void,
): Promise<CarSettings[]> => {
  try {
    const params: any = { user_id: userId };
    if (carId) {
      params.car_id = carId;
    }

    const response = await axios.get<CarSettingsApiResponse<CarSettings[]>>(API_BASE, {
      params,
    });

    if (response.data.success) {
      return response.data.data || [];
    } else {
      throw new Error(response.data.error || '愛車設定の取得に失敗しました');
    }
  } catch (err) {
    console.error('愛車設定取得失敗', err);
    onError?.(err);
    return [];
  }
};

/**
 * 愛車設定詳細取得
 */
export const fetchCarSettingsDetail = async (
  id: number,
  onError?: (error: unknown) => void,
): Promise<CarSettings | null> => {
  try {
    const response = await axios.get<CarSettingsApiResponse<CarSettings>>(`${API_BASE}/${id}/`);

    if (response.data.success) {
      return response.data.data || null;
    } else {
      throw new Error(response.data.error || '愛車設定の取得に失敗しました');
    }
  } catch (err) {
    console.error('愛車設定詳細取得失敗', err);
    onError?.(err);
    return null;
  }
};

/**
 * 愛車設定作成・更新
 */
export const createOrUpdateCarSettings = async (
  data: CarSettingsCreateUpdateRequest,
  onError?: (error: unknown) => void,
): Promise<CarSettings | null> => {
  try {
    const formData = new FormData();

    // 基本情報
    formData.append('user_id', data.user_id);
    formData.append('car_id', data.car_id);

    if (data.license_plate_text !== undefined) {
      formData.append('license_plate_text', data.license_plate_text);
    }
    if (data.car_name !== undefined) {
      formData.append('car_name', data.car_name);
    }

    // 画像ファイル
    const imageFields = [
      'logo_mark_image',
      'original_number_image',
      'car_photo_front',
      'car_photo_side',
      'car_photo_rear',
      'car_photo_diagonal',
    ] as const;

    imageFields.forEach((field) => {
      const file = data[field];
      if (file) {
        formData.append(field, file);
      }
    });

    const response = await axios.post<CarSettingsApiResponse<CarSettings>>(
      API_BASE + '/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.data.success) {
      return response.data.data || null;
    } else {
      throw new Error(response.data.error || '愛車設定の保存に失敗しました');
    }
  } catch (err) {
    console.error('愛車設定作成・更新失敗', err);
    onError?.(err);
    return null;
  }
};

/**
 * 愛車設定更新（PUTメソッド）
 */
export const updateCarSettings = async (
  id: number,
  data: Partial<CarSettingsCreateUpdateRequest>,
  onError?: (error: unknown) => void,
): Promise<CarSettings | null> => {
  try {
    const formData = new FormData();

    // 基本情報
    if (data.user_id) formData.append('user_id', data.user_id);
    if (data.car_id) formData.append('car_id', data.car_id);
    if (data.license_plate_text !== undefined) {
      formData.append('license_plate_text', data.license_plate_text);
    }
    if (data.car_name !== undefined) {
      formData.append('car_name', data.car_name);
    }

    // 画像ファイル
    const imageFields = [
      'logo_mark_image',
      'original_number_image',
      'car_photo_front',
      'car_photo_side',
      'car_photo_rear',
      'car_photo_diagonal',
    ] as const;

    imageFields.forEach((field) => {
      const file = data[field];
      if (file) {
        formData.append(field, file);
      }
    });

    // 削除フラグ処理
    const deleteFlags = [
      'delete_logo_mark_image',
      'delete_original_number_image', 
      'delete_car_photo_front',
      'delete_car_photo_side',
      'delete_car_photo_rear',
      'delete_car_photo_diagonal',
    ] as const;

    deleteFlags.forEach((flag) => {
      if (data[flag]) {
        formData.append(flag, 'true');
      }
    });

    const response = await axios.put<CarSettingsApiResponse<CarSettings>>(
      `${API_BASE}/${id}/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.data.success) {
      return response.data.data || null;
    } else {
      throw new Error(response.data.error || '愛車設定の更新に失敗しました');
    }
  } catch (err) {
    console.error('愛車設定更新失敗', err);
    onError?.(err);
    return null;
  }
};

/**
 * 愛車設定削除
 */
export const deleteCarSettings = async (
  id: number,
  onError?: (error: unknown) => void,
): Promise<boolean> => {
  try {
    console.log('🚀 deleteCarSettings開始:', id);
    console.log('📡 API URL:', `${API_BASE}/${id}/`);
    
    const response = await axios.delete<CarSettingsApiResponse<null>>(`${API_BASE}/${id}/`);
    
    console.log('📥 削除APIレスポンス:', {
      status: response.status,
      success: response.data.success,
      message: response.data.message,
      data: response.data
    });

    if (response.data.success) {
      console.log('✅ deleteCarSettings成功');
      return true;
    } else {
      console.log('❌ deleteCarSettings失敗 (API success=false)');
      throw new Error(response.data.error || '愛車設定の削除に失敗しました');
    }
  } catch (err) {
    console.error('❌ 愛車設定削除失敗', err);
    onError?.(err);
    return false;
  }
}; 