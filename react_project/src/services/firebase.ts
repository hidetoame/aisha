import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Firebase設定（環境変数から取得）
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// 設定値をデバッグ出力
console.log('Firebase Config Debug:', {
  apiKey: firebaseConfig.apiKey ? 'Set' : 'Missing',
  authDomain: firebaseConfig.authDomain || 'Missing',
  projectId: firebaseConfig.projectId || 'Missing',
  storageBucket: firebaseConfig.storageBucket || 'Missing',
  messagingSenderId: firebaseConfig.messagingSenderId || 'Missing',
  appId: firebaseConfig.appId || 'Missing',
});

// Firebaseアプリを初期化
let app;
let auth: Auth;

try {
  // 必須設定のチェック
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error('Firebase設定が不完全です。環境変数を確認してください。');
  }
  
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // 開発環境でreCAPTCHA設定を調整
  if (typeof window !== 'undefined') {
    auth.settings.appVerificationDisabledForTesting = false;
    
    // 開発環境でのdomain設定
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - Firebase Auth configured for localhost');
    }
  }
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // エラーが発生した場合は空のモックオブジェクトを作成
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
    signOut: () => Promise.resolve(),
  } as any;
}

export { auth };

// デフォルトエクスポート
export default app;
