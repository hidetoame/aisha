import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import {
  sendSMSVerification,
  verifySMSCode,
  updateUserInfo,
  formatPhoneNumber,
  validatePhoneNumber,
} from '../../services/api/aws-sms-auth';

interface AwsSmsLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  onError: (message: string) => void;
}

type LoginStep = 'phone' | 'verification' | 'registration';

const AwsSmsLoginModal: React.FC<AwsSmsLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onError,
}) => {
  const [currentStep, setCurrentStep] = useState<LoginStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const resetForm = () => {
    setCurrentStep('phone');
    setPhoneNumber('');
    setVerificationCode('');
    setNickname('');
    setIsLoading(false);
    setSessionId(null);
    setUserId(null);
    setIsNewUser(false);
    setExpiresAt(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // タイマー表示用のステート
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (expiresAt && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, expiresAt]);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const handleSendSMS = async () => {
    if (!phoneNumber) {
      onError('電話番号を入力してください');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      onError('正しい電話番号を入力してください（例: 090-1234-5678）');
      return;
    }

    setIsLoading(true);
    try {
      const response = await sendSMSVerification(phoneNumber);
      setSessionId(response.session_id);
      setTimeLeft(response.expires_in);
      setExpiresAt(Date.now() + response.expires_in * 1000);
      setCurrentStep('verification');
      onError(''); // Clear any previous errors
      console.log('AWS SMS送信成功:', response);
    } catch (error) {
      console.error('AWS SMS送信エラー:', error);
      onError(error instanceof Error ? error.message : 'SMS送信に失敗しました');
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

    if (!sessionId) {
      onError('認証セッションが無効です。最初からやり直してください。');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔐 AWS SMS認証開始...');
      const response = await verifySMSCode(sessionId, verificationCode, phoneNumber);
      
      console.log('✅ AWS SMS認証成功:', response);
      
      setUserId(response.user_id);
      setIsNewUser(response.is_new_user);
      
      if (response.is_new_user) {
        // 新規ユーザーの場合、ニックネーム登録へ
        console.log('🆕 新規ユーザー登録へ');
        setCurrentStep('registration');
      } else {
        // 既存ユーザーの場合、ログイン成功
        console.log('👤 既存ユーザーでログイン');
        const appUser: User = {
          id: response.user_id,
          name: response.nickname,
          loginType: 'aws_sms',
          phoneNumber: response.phone_number,
          isAdmin: false, // AWS SMS認証では管理者フラグは別途設定
        };
        
        console.log('✅ ログイン成功:', appUser);
        onLoginSuccess(appUser);
        handleClose();
      }
    } catch (error) {
      console.error('💥 AWS SMS認証エラー:', error);
      onError(error instanceof Error ? error.message : '認証に失敗しました');
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

    if (!userId) {
      onError('認証セッションが無効です。最初からやり直してください。');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🆕 新規ユーザー登録:', {
        userId,
        nickname: nickname.trim()
      });
      
      const response = await updateUserInfo(userId, nickname.trim());
      
      if (response.success) {
        // 登録成功
        const appUser: User = {
          id: response.user_id,
          name: response.nickname,
          loginType: 'aws_sms',
          phoneNumber: phoneNumber,
          isAdmin: false,
        };
        
        console.log('✅ ユーザー登録成功:', appUser);
        onLoginSuccess(appUser);
        handleClose();
      } else {
        onError('ユーザー登録に失敗しました');
      }
    } catch (error) {
      console.error('💥 ユーザー登録エラー:', error);
      onError(error instanceof Error ? error.message : 'ユーザー登録に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                disabled={isLoading}
              />
            </div>
            <p className="text-gray-400 mb-4 text-center text-sm">
              AWS SNS経由でSMS認証番号を送信します
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
              {timeLeft > 0 && (
                <p className="text-yellow-400 text-sm">
                  有効期限: {formatTime(timeLeft)}
                </p>
              )}
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
                disabled={isLoading}
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
              disabled={isLoading}
              className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-gray-200 font-bold py-2 px-4 rounded-lg transition duration-150 ease-in-out mb-3"
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
                disabled={isLoading}
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
          disabled={isLoading}
          className="w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-gray-200 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

export default AwsSmsLoginModal;