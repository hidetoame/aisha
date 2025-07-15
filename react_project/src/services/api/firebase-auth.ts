import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  User as FirebaseUser,
  signOut
} from 'firebase/auth';
import { auth } from '../firebase';
import { User } from '../../types';

// reCAPTCHA verifier instance
let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * reCAPTCHA verifierを初期化
 * @param containerId reCAPTCHAコンテナのID
 */
export const initializeRecaptcha = (containerId: string): RecaptchaVerifier => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }
  
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      console.log('reCAPTCHA解決済み');
    },
    'expired-callback': () => {
      console.log('reCAPTCHA期限切れ');
    },
    'error-callback': (error: any) => {
      console.error('reCAPTCHA エラー:', error);
    }
  });
  
  return recaptchaVerifier;
};

/**
 * 電話番号にSMS認証コードを送信
 * @param phoneNumber 電話番号（+81形式）
 * @param containerId reCAPTCHAコンテナのID
 * @returns ConfirmationResult
 */
export const sendSMSVerification = async (
  phoneNumber: string, 
  containerId: string
): Promise<ConfirmationResult> => {
  try {
    // 日本の電話番号を国際形式に変換
    const internationalNumber = convertToInternationalFormat(phoneNumber);
    
    // reCAPTCHA verifierを初期化
    const appVerifier = initializeRecaptcha(containerId);
    
    // SMS送信
    const confirmationResult = await signInWithPhoneNumber(
      auth, 
      internationalNumber, 
      appVerifier
    );
    
    console.log('SMS送信成功:', internationalNumber);
    return confirmationResult;
  } catch (error) {
    console.error('SMS送信エラー:', error);
    throw new Error(getErrorMessage(error));
  }
};

/**
 * SMS認証コードを確認
 * @param confirmationResult sendSMSVerificationの結果
 * @param verificationCode 6桁の認証コード
 * @returns FirebaseUser
 */
export const verifySMSCode = async (
  confirmationResult: ConfirmationResult,
  verificationCode: string
): Promise<FirebaseUser> => {
  try {
    const result = await confirmationResult.confirm(verificationCode);
    console.log('SMS認証成功:', result.user.uid);
    return result.user;
  } catch (error) {
    console.error('SMS認証エラー:', error);
    throw new Error(getErrorMessage(error));
  }
};

/**
 * 日本の電話番号を国際形式に変換
 * @param phoneNumber 日本の電話番号
 * @returns 国際形式の電話番号
 */
export const convertToInternationalFormat = (phoneNumber: string): string => {
  // 数字のみ抽出
  const numbers = phoneNumber.replace(/\D/g, '');
  
  // 日本の電話番号（11桁）の場合
  if (numbers.length === 11 && numbers.startsWith('0')) {
    // 最初の0を削除して+81を追加
    return `+81${numbers.substring(1)}`;
  }
  
  // 既に+81形式の場合はそのまま
  if (numbers.length === 12 && phoneNumber.startsWith('+81')) {
    return phoneNumber;
  }
  
  throw new Error('正しい日本の電話番号を入力してください（例: 090-1234-5678）');
};

/**
 * Firebaseユーザーをアプリケーション用のユーザーオブジェクトに変換
 * @param firebaseUser FirebaseUser
 * @param nickname ユーザーのニックネーム
 * @returns User
 */
export const convertFirebaseUserToAppUser = async (
  firebaseUser: FirebaseUser,
  nickname?: string
): Promise<User> => {
  // Firebase IDトークンを取得
  const idToken = await firebaseUser.getIdToken();
  
  // バックエンドでユーザー情報を取得/作成
  const API_BASE = import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api';
  const response = await fetch(`${API_BASE}/firebase-auth/user-info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      firebaseUid: firebaseUser.uid,
      phoneNumber: firebaseUser.phoneNumber,
      nickname: nickname,
    }),
  });
  
  if (!response.ok) {
    console.error('サーバーからユーザー情報を取得できませんでした。Firebase情報のみでログインします。');
    // サーバーエラーの場合、Firebase情報のみでユーザーオブジェクトを作成
    return {
      id: firebaseUser.uid,
      name: nickname || 'ユーザー',
      phoneNumber: firebaseUser.phoneNumber || '',
      isAdmin: false,
      loginType: 'phone' as const,
      credits: 0, // デフォルト値
    };
  }
  
  const userData = await response.json();
  
  return {
    id: userData.id,
    name: userData.nickname || 'ユーザー',
    loginType: 'phone',
    phoneNumber: userData.phoneNumber,
    isAdmin: userData.isAdmin || false,
  };
};

/**
 * 現在のFirebaseユーザーのIDトークンを取得
 * @returns IDトークン
 */
export const getCurrentUserIdToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
};

/**
 * Firebase認証をログアウト
 */
export const signOutFirebase = async (): Promise<void> => {
  try {
    await signOut(auth);
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
    console.log('Firebase認証ログアウト成功');
  } catch (error) {
    console.error('Firebase認証ログアウトエラー:', error);
    throw error;
  }
};

/**
 * reCAPTCHAをクリーンアップ
 */
export const cleanupRecaptcha = (): void => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
};

/**
 * Firebaseエラーを分かりやすいメッセージに変換
 * @param error Firebaseエラー
 * @returns ユーザーフレンドリーなエラーメッセージ
 */
const getErrorMessage = (error: any): string => {
  const errorCode = error?.code || '';
  
  switch (errorCode) {
    case 'auth/invalid-phone-number':
      return '無効な電話番号です。正しい形式で入力してください。';
    case 'auth/missing-phone-number':
      return '電話番号を入力してください。';
    case 'auth/quota-exceeded':
      return 'SMS送信の上限に達しました。しばらく時間をおいてから再試行してください。';
    case 'auth/invalid-verification-code':
      return '認証コードが正しくありません。';
    case 'auth/invalid-verification-id':
      return '認証セッションが無効です。最初からやり直してください。';
    case 'auth/code-expired':
      return '認証コードの有効期限が切れています。新しいコードを取得してください。';
    case 'auth/too-many-requests':
      return 'リクエストが多すぎます。しばらく時間をおいてから再試行してください。';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA認証に失敗しました。ページを再読み込みして再試行してください。';
    default:
      return error?.message || '認証エラーが発生しました。';
  }
};