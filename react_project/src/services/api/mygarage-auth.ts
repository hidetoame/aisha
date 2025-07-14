// MyGarage認証API
interface MyGarageLoginRequest {
  username: string;
  password: string;
}

// AISHA Admin Status API
interface AdminStatusResponse {
  frontend_user_id: string;
  is_admin: boolean;
}

interface MyGarageLoginResponse {
  data?: any; // 実際のAPIレスポンス構造を確認するために一時的にany型を使用
  message?: string;
  error?: {
    message: string;
  };
}

interface MyGarageUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  credits: number;
  isAdmin?: boolean;
  personalSettings?: any;
}

const MGDRIVE_API_BASE_URL = process.env.MGDRIVE_API_BASE_URL || 'https://md2.mygare.jp/api';
const AISHA_API_BASE_URL = import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api';

// AISHA APIから管理者ステータスを取得する関数
const fetchAdminStatus = async (userId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${AISHA_API_BASE_URL}/users/${userId}/admin-status/`);
    if (response.ok) {
      const data: AdminStatusResponse = await response.json();
      return data.is_admin;
    }
  } catch (error) {
    console.warn('Failed to fetch admin status:', error);
  }
  return false;
};

export const myGarageLogin = async (username: string, password: string): Promise<MyGarageUser | null> => {
  try {
    // メールアドレスの形式チェック
    if (!username || !username.includes('@')) {
      throw new Error('メールアドレスの形式が正しくありません');
    }
    
    // パスワードの基本チェック
    if (!password || password.length < 1) {
      throw new Error('パスワードを入力してください');
    }
    
    // まずは実際のMyGarage APIにアクセスを試行
    // MyGarage APIの形式を複数試行
    let response: Response;
    
    // 1. 最初にJSON形式でトライ
    try {
      response = await fetch(`${MGDRIVE_API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: username, // MyGarage APIは email フィールドを期待している
          password,
          device_info: "AISHA Web App", // デバイス情報（必須）
        }),
      });
      
      if (response.ok) {
        // 成功した場合はそのまま進む
      } else if (response.status === 400) {
        // 400エラーの場合は、フォーム形式で再試行
        const formData = new FormData();
        formData.append('email', username); // MyGarage APIは email フィールドを期待している
        formData.append('password', password);
        formData.append('device_info', 'AISHA Web App'); // デバイス情報（必須）
        
        response = await fetch(`${MGDRIVE_API_BASE_URL}/login`, {
          method: 'POST',
          body: formData,
        });
      }
    } catch (error) {
      console.error('Initial login attempt failed:', error);
      throw error;
    }

    if (!response.ok) {
      // エラーレスポンスの詳細を確認
      let errorMessage = `ログインに失敗しました: ${response.status}`;
      try {
        const errorData = await response.text();
        console.error('MyGarage API error response:', errorData);
        
        // JSONレスポンスの場合は解析してメッセージを抽出
        try {
          const errorJson = JSON.parse(errorData);
          if (errorJson.error && errorJson.error.message) {
            // MyGarage APIからのエラーメッセージを分かりやすく変換
            const apiErrorMessage = errorJson.error.message;
            if (apiErrorMessage === 'Unauthorized' || response.status === 401) {
              errorMessage = 'メールアドレスまたはパスワードが正しくありません';
            } else {
              errorMessage = apiErrorMessage;
            }
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (parseError) {
          // JSON解析に失敗した場合は生のレスポンスを使用
          if (response.status === 401) {
            errorMessage = 'メールアドレスまたはパスワードが正しくありません';
          } else {
            errorMessage += ` - ${errorData}`;
          }
        }
      } catch (e) {
        console.error('Could not parse error response');
      }
      
      // 404エラーの場合は、テスト用の実装を使用
      if (response.status === 404) {
        console.warn('MyGarage API not found, using test implementation');
        return handleTestLogin(username, password);
      }
      throw new Error(errorMessage);
    }

    // レスポンスの内容を確認
    const responseText = await response.text();
    console.log('MyGarage API response:', responseText);
    
    let data: MyGarageLoginResponse;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
      console.log('data.data:', data.data);
      console.log('data.data?.token:', data.data?.token);
      
      // レスポンスの全フィールドを確認
      if (data.data) {
        console.log('Available fields in data.data:', Object.keys(data.data));
        console.log('Full data.data object:', JSON.stringify(data.data, null, 2));
      }
    } catch (e) {
      console.error('Could not parse JSON response:', responseText);
      throw new Error('APIレスポンスの解析に失敗しました');
    }

    if (data.data) {
      // トークンフィールドの確認（複数の可能性のあるフィールド名をチェック）
      const token = data.data.token || data.data.mygarage_token || data.data.device_token;
      
      if (token) {
        // トークンをローカルストレージに保存
        localStorage.setItem('mygarage-token', token);
        console.log('Token saved:', token);
      }
      
      // ユーザーIDの取得（複数のフィールドを確認）
      const userIdFromCreatedBy = data.data.created_by?.toString();
      const userIdFromId = data.data.id?.toString();
      const userIdFromUserId = data.data.user_id?.toString();
      
      // ユーザーIDの優先順位: created_by > user_id > id > フォールバック
      let userId = userIdFromCreatedBy || userIdFromUserId || userIdFromId;
      
      // フォールバック処理：特定のメールアドレスの場合は200120を使用
      if (!userId || userId === 'unknown') {
        const email = data.data.email;
        // 管理者ユーザーのメールアドレスパターンをチェック
        if (email && (email.includes('200120') || email === 'h0920@aisha.jp' || email === 'admin@aisha.jp')) {
          userId = '200120';
        } else {
          userId = 'unknown';
        }
      }
      
      // 管理者ステータスを取得
      let isAdmin = await fetchAdminStatus(userId);
      
      // 一時的なフォールバック：ユーザー200120は強制的に管理者にする
      if (userId === '200120') {
        isAdmin = true;
      }

      // AISHAアプリ用のユーザーオブジェクトに変換
      const aishaUser: MyGarageUser = {
        id: userId, // MyGarageの実際のユーザーIDを使用
        username: data.data.email || 'unknown', // MyGarage APIではemailをusernameとして使用
        name: data.data.name || 'MyGarageユーザー', // これがログイン後に表示される名前
        email: data.data.email || '',
        credits: 100, // デフォルトクレジット（今後APIから取得予定）
        isAdmin, // 管理者フラグを追加
        personalSettings: {
          numberManagement: {},
          referenceRegistration: {
            carPhotos: [
              { viewAngle: 'front', label: 'フロント正面' },
              { viewAngle: 'side', label: 'サイド' },
              { viewAngle: 'rear', label: 'リア' },
              { viewAngle: 'front_angled_7_3', label: 'フロント斜め' },
              { viewAngle: 'rear_angled_7_3', label: 'リア斜め' }
            ]
          }
        },
      };

      console.log('Successfully created AISHA user:', aishaUser);
      return aishaUser;
    } else {
      // エラーレスポンスの処理
      console.log('Login failed - checking error conditions:');
      console.log('data.data exists:', !!data.data);
      console.log('data.error exists:', !!data.error);
      console.log('data.message exists:', !!data.message);
      
      let errorMessage = 'ログインに失敗しました';
      if (data.error && data.error.message) {
        const apiErrorMessage = data.error.message;
        if (apiErrorMessage === 'Unauthorized') {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません';
        } else {
          errorMessage = apiErrorMessage;
        }
      } else if (data.message) {
        errorMessage = data.message;
      }
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('MyGarage login error:', error);
    // ネットワークエラーの場合もテスト用実装を使用
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Network error, using test implementation');
      return handleTestLogin(username, password);
    }
    throw error;
  }
};

// テスト用のログイン実装
const handleTestLogin = async (username: string, password: string): Promise<MyGarageUser | null> => {
  // 簡単なテストユーザーの実装
  const testUsers = [
    { id: '1', username: 'test@example.com', name: 'テストユーザー1', email: 'test@example.com' },
    { id: '2', username: 'demo@example.com', name: 'デモユーザー', email: 'demo@example.com' },
    { id: '3', username: 'sample@example.com', name: 'サンプルユーザー', email: 'sample@example.com' }
  ];

  // どんなパスワードでもログイン可能（テスト用）
  const user = testUsers.find(u => u.username === username || u.username.includes(username));
  
  if (user) {
    const testToken = `test-token-${Date.now()}`;
    localStorage.setItem('mygarage-token', testToken);
    
    // テストユーザーの管理者ステータスを取得
    let isAdmin = await fetchAdminStatus(user.id);
    
    // 一時的なフォールバック：ユーザー200120は強制的に管理者にする
    if (user.id === '200120') {
      isAdmin = true;
    }
    
    const testUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      credits: 100,
      isAdmin, // 管理者フラグを追加
      personalSettings: {
        numberManagement: {},
        referenceRegistration: {
          carPhotos: [
            { viewAngle: 'front', label: 'フロント正面' },
            { viewAngle: 'side', label: 'サイド' },
            { viewAngle: 'rear', label: 'リア' },
            { viewAngle: 'front_angled_7_3', label: 'フロント斜め' },
            { viewAngle: 'rear_angled_7_3', label: 'リア斜め' }
          ]
        }
      },
    };
    
    return testUser;
  }
  
  throw new Error('テストユーザーが見つかりません。test@example.com を試してください。');
};

export const myGarageLogout = async (): Promise<void> => {
  try {
    const token = localStorage.getItem('mygarage-token');
    
    if (token) {
      await fetch(`${MGDRIVE_API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('MyGarage logout error:', error);
  } finally {
    // トークンを削除
    localStorage.removeItem('mygarage-token');
  }
};

export const validateMyGarageToken = async (): Promise<MyGarageUser | null> => {
  try {
    const token = localStorage.getItem('mygarage-token');
    
    if (!token) {
      return null;
    }

    const response = await fetch(`${MGDRIVE_API_BASE_URL}/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // トークンが無効な場合は削除
      localStorage.removeItem('mygarage-token');
      return null;
    }

    const data: MyGarageLoginResponse = await response.json();

    if (data.data) {
      const token = data.data.token || data.data.mygarage_token || data.data.device_token;
      
      if (token) {
        // ユーザーIDの取得（複数のフィールドを確認）
        const userIdFromCreatedBy = data.data.created_by?.toString();
        const userIdFromId = data.data.id?.toString();
        const userIdFromUserId = data.data.user_id?.toString();
        
        // ユーザーIDの優先順位: created_by > user_id > id > フォールバック
        let userId = userIdFromCreatedBy || userIdFromUserId || userIdFromId;
        
        // フォールバック処理：特定のメールアドレスの場合は200120を使用
        if (!userId || userId === 'unknown') {
          const email = data.data.email;
          // 管理者ユーザーのメールアドレスパターンをチェック
          if (email && (email.includes('200120') || email === 'h0920@aisha.jp' || email === 'admin@aisha.jp')) {
            userId = '200120';
          } else {
            userId = 'unknown';
          }
        }
        
        // 管理者ステータスを取得
        let isAdmin = await fetchAdminStatus(userId);
        
        // 一時的なフォールバック：ユーザー200120は強制的に管理者にする
        if (userId === '200120') {
          isAdmin = true;
        }

        const aishaUser: MyGarageUser = {
          id: userId,
          username: data.data.email || 'unknown',
          name: data.data.name || 'MyGarageユーザー',
          email: data.data.email || '',
          credits: 100, // デフォルトクレジット（今後APIから取得予定）
          isAdmin, // 管理者フラグを追加
          personalSettings: {
            numberManagement: {},
            referenceRegistration: {
              carPhotos: [
                { viewAngle: 'front', label: 'フロント正面' },
                { viewAngle: 'side', label: 'サイド' },
                { viewAngle: 'rear', label: 'リア' },
                { viewAngle: 'front_angled_7_3', label: 'フロント斜め' },
                { viewAngle: 'rear_angled_7_3', label: 'リア斜め' }
              ]
            }
          },
        };

        return aishaUser;
      }
    }
    
    // トークンが無効または存在しない場合
    localStorage.removeItem('mygarage-token');
    return null;
  } catch (error) {
    console.error('MyGarage token validation error:', error);
    localStorage.removeItem('mygarage-token');
    return null;
  }
}; 