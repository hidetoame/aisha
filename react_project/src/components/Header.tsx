import React, { useState, useRef, useEffect } from 'react';
import { User, AppViewMode } from '../types';
import { APP_NAME } from '@/constants';
import {
  CogIcon,
  UserCircleIcon,
  CreditCardIcon,
  LoginIcon,
  LogoutIcon,
  ViewListIcon,
  RectangleStackIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon,
  QueueListIcon,
  SparklesIcon,
  AdjustmentsVerticalIcon,
} from './icons/HeroIcons';
import { useCredits } from '@/contexts/CreditsContext';

interface HeaderProps {
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onPlansClick: () => void;
  onToggleAdminView: () => void;
  isAdminView: boolean;
  onGenerationHistoryClick: () => void;
  onGoodsHistoryClick: () => void;
  currentAppView?: AppViewMode;
  onToggleAppViewMode?: () => void;
  onPersonalSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLoginClick,
  onLogoutClick,
  onPlansClick,
  onToggleAdminView,
  isAdminView,
  onGenerationHistoryClick,
  onGoodsHistoryClick,
  currentAppView,
  onToggleAppViewMode,
  onPersonalSettingsClick,
}) => {
  const credits = useCredits();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMobileMenuAction = (action?: () => void) => {
    if (action) action();
    setIsUserMenuOpen(false);
  };

  const appViewButtonText =
    currentAppView === 'generator' ? 'タイムライン' : '愛車から生成';
  const appViewButtonIcon =
    currentAppView === 'generator' ? (
      <QueueListIcon className="w-5 h-5 md:mr-1.5" />
    ) : (
      <SparklesIcon className="w-5 h-5 md:mr-1.5" />
    );
  const appViewButtonTitle =
    currentAppView === 'generator'
      ? '公開タイムラインを見る'
      : '愛車から画像を生成';

  return (
    <header className="bg-gray-800 shadow-lg sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          {/* <img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/6d/23/22/6d2322a2-79d0-4009-6663-b46e08de5283/AppIcon-1x_U007epad-0-9-0-0-0-0-85-220-0.png/1200x600wa.png" alt="AISHA ロゴ" className="h-10 w-10 rounded-md mr-3 object-contain" /> */}
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-400 tracking-tight">
            {APP_NAME}
          </h1>
        </div>

        <nav className="hidden md:flex items-center space-x-2 md:space-x-3">
          {user ? (
            <>
              {/* 1. Guest Name */}
              <div className="flex items-center text-sm text-gray-300">
                <UserCircleIcon className="w-5 h-5 mr-1.5 text-indigo-400" />
                <span>{user.name}</span>
              </div>
              {/* 2. Credits */}
              <div className="flex items-center text-sm text-green-400">
                <CreditCardIcon className="w-5 h-5 mr-1" />
                <span>{credits} クレジット</span>
              </div>
              {/* 3. Charge Button */}
              <button
                onClick={onPlansClick}
                className="text-sm text-gray-300 hover:text-indigo-400 transition-colors duration-150 flex items-center bg-gray-700 hover:bg-gray-600 px-2 md:px-3 py-1.5 rounded-lg"
                title="クレジットをチャージ"
              >
                <CreditCardIcon className="w-5 h-5 md:mr-1.5" />{' '}
                <span className="hidden md:inline">チャージ</span>
              </button>
              {/* 4. Library Button */}
              <button
                onClick={onGenerationHistoryClick}
                className="text-sm text-gray-300 hover:text-indigo-400 transition-colors duration-150 flex items-center bg-gray-700 hover:bg-gray-600 px-2 md:px-3 py-1.5 rounded-lg"
                title="ライブラリを見る"
              >
                <RectangleStackIcon className="w-5 h-5 md:mr-1.5" />{' '}
                <span className="hidden md:inline">ライブラリ</span>
              </button>
              {/* 5. Timeline / Generate Toggle Button */}
              {onToggleAppViewMode && !isAdminView && (
                <button
                  onClick={onToggleAppViewMode}
                  className="text-sm text-gray-300 hover:text-indigo-400 transition-colors duration-150 flex items-center bg-gray-700 hover:bg-gray-600 px-2 md:px-3 py-1.5 rounded-lg"
                  title={appViewButtonTitle}
                >
                  {appViewButtonIcon}
                  <span className="hidden md:inline">{appViewButtonText}</span>
                </button>
              )}
              {/* 6. Goods History Button */}
              <button
                onClick={onGoodsHistoryClick}
                className="text-sm text-gray-300 hover:text-indigo-400 transition-colors duration-150 flex items-center bg-gray-700 hover:bg-gray-600 px-2 md:px-3 py-1.5 rounded-lg"
                title="グッズ作成履歴を見る"
              >
                <BuildingStorefrontIcon className="w-5 h-5 md:mr-1.5" />{' '}
                <span className="hidden md:inline">グッズ履歴</span>
              </button>
              {/* Personal Settings Button - Desktop - Moved */}
              {onPersonalSettingsClick && !isAdminView && (
                <button
                  onClick={onPersonalSettingsClick}
                  className="text-sm text-gray-300 hover:text-indigo-400 transition-colors duration-150 flex items-center bg-gray-700 hover:bg-gray-600 px-2 md:px-3 py-1.5 rounded-lg"
                  title="愛車設定"
                >
                  <AdjustmentsVerticalIcon className="w-5 h-5 md:mr-1.5" />{' '}
                  <span className="hidden md:inline">愛車設定</span>
                </button>
              )}
              {/* 7. Logout Button */}
              <button
                onClick={onLogoutClick}
                className="text-sm text-gray-300 hover:text-red-400 transition-colors duration-150 flex items-center bg-gray-700 hover:bg-red-700/50 px-2 md:px-3 py-1.5 rounded-lg"
                title="ログアウト"
              >
                <LogoutIcon className="w-5 h-5 md:mr-1.5" />{' '}
                <span className="hidden md:inline">ログアウト</span>
              </button>
            </>
          ) : (
            <button
              onClick={onLoginClick}
              className="text-sm text-gray-300 hover:text-indigo-400 transition-colors duration-150 flex items-center bg-indigo-600 hover:bg-indigo-700 px-3 md:px-4 py-2 rounded-lg"
            >
              <LoginIcon className="w-5 h-5 mr-2" /> ログイン
            </button>
          )}
          <button
            onClick={onToggleAdminView}
            title={isAdminView ? 'ユーザービューへ切替' : '管理者ビューへ切替'}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-indigo-400 transition-colors duration-150"
          >
            {isAdminView ? (
              <ViewListIcon className="w-6 h-6" />
            ) : (
              <CogIcon className="w-6 h-6" />
            )}
          </button>
        </nav>

        <div className="md:hidden flex items-center" ref={menuRef}>
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-indigo-400 transition-colors duration-150 flex items-center"
              >
                <UserCircleIcon className="w-6 h-6" />
                <ChevronDownIcon
                  className={`w-4 h-4 ml-1 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-gray-700 rounded-md shadow-lg py-1 z-50 border border-gray-600">
                  {/* 1. User Info Block */}
                  <div className="px-4 py-2 border-b border-gray-600">
                    <p className="text-sm font-medium text-indigo-300">
                      {user.name}
                    </p>
                    <p className="text-xs text-green-400">
                      {credits} クレジット
                    </p>
                  </div>
                  {/* 2. Charge Button */}
                  <button
                    onClick={() => handleMobileMenuAction(onPlansClick)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center"
                  >
                    <CreditCardIcon className="w-5 h-5 mr-2" /> チャージ
                  </button>
                  {/* 3. Library Button */}
                  <button
                    onClick={() =>
                      handleMobileMenuAction(onGenerationHistoryClick)
                    }
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center"
                  >
                    <RectangleStackIcon className="w-5 h-5 mr-2" /> ライブラリ
                  </button>
                  {/* 4. Timeline / Generate Toggle Button */}
                  {onToggleAppViewMode && !isAdminView && (
                    <button
                      onClick={() =>
                        handleMobileMenuAction(onToggleAppViewMode)
                      }
                      className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center"
                    >
                      {currentAppView === 'generator' ? (
                        <QueueListIcon className="w-5 h-5 mr-2" />
                      ) : (
                        <SparklesIcon className="w-5 h-5 mr-2" />
                      )}
                      {appViewButtonText}
                    </button>
                  )}
                  {/* 5. Goods History Button */}
                  <button
                    onClick={() => handleMobileMenuAction(onGoodsHistoryClick)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center"
                  >
                    <BuildingStorefrontIcon className="w-5 h-5 mr-2" />{' '}
                    グッズ履歴
                  </button>
                  {/* Personal Settings Button - Mobile */}
                  {onPersonalSettingsClick && !isAdminView && (
                    <button
                      onClick={() =>
                        handleMobileMenuAction(onPersonalSettingsClick)
                      }
                      className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center"
                    >
                      <AdjustmentsVerticalIcon className="w-5 h-5 mr-2" />{' '}
                      愛車設定
                    </button>
                  )}
                  {/* Logout Button (Moved up) */}
                  <button
                    onClick={() => handleMobileMenuAction(onLogoutClick)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-red-600 hover:text-white flex items-center border-t border-gray-600"
                  >
                    <LogoutIcon className="w-5 h-5 mr-2" /> ログアウト
                  </button>
                  {/* Admin Toggle Button (Moved down) */}
                  <button
                    onClick={() => handleMobileMenuAction(onToggleAdminView)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600 hover:text-white flex items-center border-t border-gray-600 mt-1 pt-2"
                  >
                    {isAdminView ? (
                      <ViewListIcon className="w-5 h-5 mr-2" />
                    ) : (
                      <CogIcon className="w-5 h-5 mr-2" />
                    )}
                    {isAdminView ? 'ユーザービュー' : '管理者ビュー'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="text-sm text-gray-300 hover:text-indigo-400 transition-colors duration-150 flex items-center bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg"
            >
              <LoginIcon className="w-5 h-5 mr-1.5" /> ログイン
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
