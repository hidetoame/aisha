import React, { useState } from 'react';
import { 
  PhoneLoginRequest, 
  PhoneLoginResponse, 
  PhoneVerificationRequest, 
  PhoneVerificationResponse,
  PhoneUserRegistrationRequest,
  PhoneUserRegistrationResponse,
  User
} from '../../types';

interface PhoneLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onError: (message: string) => void;
}

type LoginStep = 'phone' | 'verification' | 'registration';

const PhoneLoginModal: React.FC<PhoneLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onError,
}) => {
  const [currentStep, setCurrentStep] = useState<LoginStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setCurrentStep('phone');
    setPhoneNumber('');
    setVerificationCode('');
    setNickname('');
    setSessionId('');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const formatPhoneNumber = (value: string) => {
    // 数字のみ抽出
    const numbers = value.replace(/\D/g, '');
    
    // 日本の電話番号形式に整形
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSendSMS = async () => {
    if (!phoneNumber) {
      onError('電話番号を入力してください');
      return;
    }

    // 電話番号の基本バリデーション
    const numbers = phoneNumber.replace(/\D/g, '');
    if (numbers.length !== 11 || !numbers.startsWith('0')) {
      onError('正しい電話番号を入力してください（例: 090-1234-5678）');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/phone-login/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: numbers,
        } as PhoneLoginRequest),
      });

      const data: PhoneLoginResponse = await response.json();
      
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId);
        setCurrentStep('verification');
        onError(''); // Clear any previous errors
      } else {
        onError(data.message || 'SMS送信に失敗しました');
      }
    } catch (error) {
      console.error('SMS送信エラー:', error);
      onError('SMS送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      onError('認証番号を入力してください');
      return;
    }

    if (verificationCode.length !== 6) {
      onError('認証番号は6桁で入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/phone-login/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          verificationCode,
          sessionId,
        } as PhoneVerificationRequest),
      });

      const data: PhoneVerificationResponse = await response.json();
      
      if (data.success) {
        if (data.isNewUser) {
          // 新規ユーザーの場合はニックネーム登録へ
          setCurrentStep('registration');
        } else {
          // 既存ユーザーの場合は直接ログイン
          const user: User = {
            id: data.userId!,
            name: '', // ニックネームはAPIから取得予定
            loginType: 'phone',
            phoneNumber: phoneNumber.replace(/\D/g, ''),
            isAdmin: false,
          };
          
          // トークンを保存
          if (data.token) {
            localStorage.setItem('phone-login-token', data.token);
          }
          
          onLoginSuccess(user);
          handleClose();
        }
      } else {
        onError(data.message || '認証に失敗しました');
      }
    } catch (error) {
      console.error('認証エラー:', error);
      onError('認証に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterNickname = async () => {
    if (!nickname.trim()) {
      onError('ニックネームを入力してください');
      return;
    }

    if (nickname.length > 20) {
      onError('ニックネームは20文字以内で入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/phone-login/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          nickname: nickname.trim(),
          sessionId,
        } as PhoneUserRegistrationRequest),
      });

      const data: PhoneUserRegistrationResponse = await response.json();
      
      if (data.success) {
        const user: User = {
          id: data.userId,
          name: nickname.trim(),
          loginType: 'phone',
          phoneNumber: phoneNumber.replace(/\D/g, ''),
          isAdmin: false,
        };
        
        // トークンを保存
        if (data.token) {
          localStorage.setItem('phone-login-token', data.token);
        }
        
        onLoginSuccess(user);
        handleClose();
      } else {
        onError(data.message || 'ユーザー登録に失敗しました');
      }
    } catch (error) {
      console.error('ユーザー登録エラー:', error);
      onError('ユーザー登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        {/* 電話番号入力ステップ */}
        {currentStep === 'phone' && (
          <>
            <h2 className="text-2xl font-semibold mb-6 text-center text-indigo-400">
              電話番号でログイン
            </h2>
            <div className="mb-6">
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                電話番号
              </label>
              <input
                type="tel"
                id="phoneNumber"
                placeholder="090-1234-5678"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                maxLength={13}
              />
            </div>
            <p className="text-gray-400 mb-4 text-center text-sm">
              SMS認証番号を送信します
            </p>
            <button
              onClick={handleSendSMS}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out mb-3"
            >
              {isLoading ? 'SMS送信中...' : 'SMS認証番号を送信'}
            </button>
          </>
        )}

        {/* 認証番号入力ステップ */}
        {currentStep === 'verification' && (
          <>
            <h2 className="text-2xl font-semibold mb-6 text-center text-indigo-400">
              認証番号入力
            </h2>
            <div className="mb-4">
              <p className="text-gray-300 text-sm mb-2">
                {phoneNumber} に送信された認証番号を入力してください
              </p>
            </div>
            <div className="mb-6">
              <label
                htmlFor="verificationCode"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                認証番号（6桁）
              </label>
              <input
                type="text"
                id="verificationCode"
                placeholder="123456"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 text-center text-lg tracking-widest"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
            <button
              onClick={handleVerifyCode}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out mb-3"
            >
              {isLoading ? '認証中...' : '認証する'}
            </button>
            <button
              onClick={() => setCurrentStep('phone')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
            >
              戻る
            </button>
          </>
        )}

        {/* ニックネーム登録ステップ */}
        {currentStep === 'registration' && (
          <>
            <h2 className="text-2xl font-semibold mb-6 text-center text-indigo-400">
              ニックネーム登録
            </h2>
            <div className="mb-6">
              <label
                htmlFor="nickname"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                ニックネーム
              </label>
              <input
                type="text"
                id="nickname"
                placeholder="ニックネームを入力"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
              />
              <p className="text-gray-400 text-xs mt-1">
                20文字以内で入力してください
              </p>
            </div>
            <button
              onClick={handleRegisterNickname}
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out mb-3"
            >
              {isLoading ? '登録中...' : '登録してログイン'}
            </button>
          </>
        )}

        {/* 閉じるボタン */}
        <button
          onClick={handleClose}
          className="w-full bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

export default PhoneLoginModal;