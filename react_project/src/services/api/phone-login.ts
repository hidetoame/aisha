import { AISHA_API_BASE } from '../../constants';

export const checkPhoneUserExists = async (userId: string): Promise<{ hasPhoneUser: boolean; user_id: string }> => {
  try {
    const response = await fetch(`${AISHA_API_BASE}/phone-login/check-exists/?user_id=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Phone user check error:', error);
    throw error;
  }
}; 