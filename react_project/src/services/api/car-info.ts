import { CarInfo } from '../../types';

// MyGarage愛車情報取得APIのレスポンス型
interface MyGarageCarInfoResponse {
  response: {
    status: string;
    car_data: CarInfo[];
  };
}

// MyGarage愛車情報取得API
export const getCarInfo = async (userId: string): Promise<CarInfo[]> => {
  try {
    const response = await fetch(`https://automall.jp/api/getCarInfo.php?user_id=${userId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MyGarageCarInfoResponse = await response.json();
    
    if (data.response.status === 'OK') {
      return data.response.car_data;
    } else {
      throw new Error('愛車情報の取得に失敗しました');
    }
  } catch (error) {
    console.error('Car info fetch error:', error);
    throw error;
  }
}; 