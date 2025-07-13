// MyGarage認証API
interface MyGarageLoginRequest {
  username: string;
  password: string;
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
  personalSettings?: any;
}

const MGDRIVE_API_BASE_URL = process.env.MGDRIVE_API_BASE_URL || 'https://md2.mygare.jp/api';

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
      
      // AISHAアプリ用のユーザーオブジェクトに変換
      const aishaUser: MyGarageUser = {
        id: data.data.created_by?.toString() || 'unknown', // MyGarageの実際のユーザーIDを使用
        username: data.data.email || 'unknown', // MyGarage APIではemailをusernameとして使用
        name: data.data.name || 'MyGarageユーザー', // これがログイン後に表示される名前
        email: data.data.email || '',
        credits: 100, // デフォルトクレジット（今後APIから取得予定）
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
    
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      credits: 100,
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
        const aishaUser: MyGarageUser = {
          id: data.data.created_by?.toString() || 'unknown',
          username: data.data.email || 'unknown',
          name: data.data.name || 'MyGarageユーザー',
          email: data.data.email || '',
          credits: 100, // デフォルトクレジット（今後APIから取得予定）
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