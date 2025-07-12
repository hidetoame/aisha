import React, { useState, useCallback, useEffect } from 'react';
import UserView from './views/UserView';
import AdminView from './views/AdminView';
import PublicTimelineView from './views/PublicTimelineView';
import { Header } from './components/Header';
import { GenerationHistoryModal } from './components/modals/GenerationHistoryModal';
import { GoodsCreationHistoryModal } from './components/modals/GoodsCreationHistoryModal';
import PersonalSettingsView from './views/PersonalSettingsView'; // Added
import { ToastNotification } from './components/ToastNotification'; // Added
import { ShareView } from './views/ShareView';
import {
  User,
  Plan,
  GeneratedImage,
  GoodsCreationRecord,
  GenerationOptions,
  SuzuriItem,
  SharePageParams,
  ActionAfterLoadType,
  AppViewMode,
  AspectRatio,
  PersonalUserSettings,
  CreditsRequestParams,
  CreditsOperationResponseParams,
  MenuExecutionFormData,
} from './types';
import {
  EXTEND_IMAGE_CREDIT_COST,
  DEFAULT_GENERATION_OPTIONS,
  DEFAULT_ASPECT_RATIO,
} from './constants';
import { ChargeOptionsProvider } from './contexts/ChargeOptionsContext';
import { ChargeOptionsModal } from './components/modals/ChargeOptionsModal';
import { useToast } from './contexts/ToastContext';
import { CategoriesProvider } from './contexts/CategoriesContext';
import { MenusProvider } from './contexts/MenusContext';
import { useCredits, useCreditsActions } from './contexts/CreditsContext';
import { chargeCredits } from './services/api/credits';

const App: React.FC = () => {
  const { showToast } = useToast();

  const credits = useCredits();
  const { refreshCredits } = useCreditsActions();

  const [isAdminView, setIsAdminView] = useState(false);
  const [user, setUser] = useState<User | null>(null); // Initial state set to null, login provides sample user
  const [inputLoginUsername, setInputLoginUsername] = useState('demo_user');
  const [inputLoginPassword, setInputLoginPassword] = useState('demo_pass');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showPersonalSettingsModal, setShowPersonalSettingsModal] =
    useState(false); // Added

  const [generationHistory, setGenerationHistory] = useState<GeneratedImage[]>(
    [],
  );
  const [goodsCreationHistory, setGoodsCreationHistory] = useState<
    GoodsCreationRecord[]
  >([]);
  const [showGenerationHistoryModal, setShowGenerationHistoryModal] =
    useState(false);
  const [showGoodsHistoryModal, setShowGoodsHistoryModal] = useState(false);
  // 「生成用パネルに読み込ませたい入力パラメータ（menuId, prompt, 画像ファイルなど）」をAppレベルで一時的に保持している変数
  const [menuExePanelFormData, setMenuExePanelFormData] =
    useState<MenuExecutionFormData>({
      category: null,
      menu: null,
      image: null,
      additionalPromptForMyCar: '',
      additionalPromptForOthers: '',
      aspectRatio: DEFAULT_ASPECT_RATIO,
      promptVariables: [],
      inputType: 'upload',
    });
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [optionsToLoadInPanel, setOptionsToLoadInPanel] =
    useState<GenerationOptions | null>(null);
  const [shareParams, setShareParams] = useState<SharePageParams | null>(null);
  const [actionAfterLoad, setActionAfterLoad] =
    useState<ActionAfterLoadType>(null);

  const [allPublicImages, setAllPublicImages] = useState<GeneratedImage[]>([]);
  const [currentAppView, setCurrentAppView] =
    useState<AppViewMode>('generator');

  useEffect(() => {
    // Demo user on initial load
    // setUser({ name: 'ゲスト', credits: 100, personalSettings: defaultPersonalUserSettings });

    const initialPublic: GeneratedImage[] = Array.from({ length: 10 }).map(
      (_, i) => {
        const uniqueSeed = `public_sample_${i + 1}_${Date.now()}`;
        const randomAspectRatio =
          i % 2 === 0 ? AspectRatio.Landscape_16_9 : AspectRatio.Square_1_1;
        return {
          id: `public_${i + 1}`,
          url: `https://picsum.photos/seed/${uniqueSeed}/${randomAspectRatio === AspectRatio.Landscape_16_9 ? 640 : 512}/${randomAspectRatio === AspectRatio.Landscape_16_9 ? 360 : 512}`,
          displayPrompt: `サンプル画像 ${i + 1}: ${i % 3 === 0 ? '美しい風景' : i % 3 === 1 ? '未来的な車' : '抽象的なアート'}`,
          menuName:
            i % 4 === 0
              ? 'トミカ風'
              : i % 4 === 1
                ? 'アニメ風'
                : i % 4 === 2
                  ? '海の見える駐車場'
                  : 'スタジオ',
          fullOptions: {
            ...DEFAULT_GENERATION_OPTIONS,
            selectedMenuId: `menu_sample_${i}`,
            finalPromptForService: `Sample prompt for image ${i + 1}`,
            creditCostForService: 10,
            aspectRatio: randomAspectRatio,
          },
          timestamp: new Date(Date.now() - i * 1000 * 60 * 60 * 24),
          isPublic: true,
          authorName: `ユーザー${String.fromCharCode(65 + i)}`,
          sourceImageUrl: `https://picsum.photos/seed/${uniqueSeed}_source/300/200`,
          originalUploadedImageDataUrl: `https://picsum.photos/seed/${uniqueSeed}_orig_source/300/200`,
          rating: i % 5 === 0 ? 'good' : undefined,
        };
      },
    );
    setAllPublicImages(initialPublic);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('share') === 'true') {
      const decodedImageUrl = decodeURIComponent(params.get('image') || '');
      setShareParams({
        sharedByUser: decodeURIComponent(
          params.get('user') || '不明なユーザー',
        ),
        sharedDate: decodeURIComponent(
          params.get('date') || new Date().toISOString(),
        ),
        sharedImageUrl: decodedImageUrl,
        sharedPrompt: decodeURIComponent(params.get('prompt') || ''),
        sharedMenuName: decodeURIComponent(params.get('menu') || ''),
      });
    }
  }, []);

  useEffect(() => {
    if (user) refreshCredits();
  }, [user]);

  const toggleView = useCallback(() => {
    setIsAdminView((prev) => !prev);
    if (!isAdminView) setCurrentAppView('generator');
  }, [isAdminView]);

  const handleLogin = async () => {
    try {
      const response = await fetch('http://13.114.4.219:4000/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: inputLoginUsername,
          password: inputLoginPassword,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setUser(data);
        setShowLoginModal(false);
        setCurrentAppView('generator');
      } else {
        showToast('error', 'ログインに失敗しました');
      }
    } catch (error) {
      showToast('error', 'ログインエラーが発生しました');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('http://13.114.4.219:4000/api/logout/', {
        method: 'POST',
      });
      if (response.ok) {
        setUser(null);
        setIsAdminView(false);
        setCurrentAppView('timeline');
      } else {
        showToast('error', 'ログアウトに失敗しました');
      }
    } catch (error) {
      showToast('error', 'ログアウトエラーが発生しました');
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) {
      showToast('error', 'ユーザー情報が取得できません');
      setShowPlanModal(false);
      return;
    }

    const reqBody: CreditsRequestParams = { credits: plan.credits };
    const onError = () =>
      showToast('error', 'クレジットチャージに失敗しました');
    const response: CreditsOperationResponseParams | null = await chargeCredits(
      reqBody,
      onError,
    );
    if (response) {
      showToast('success', 'クレジットチャージに成功しました');
    }

    refreshCredits();
    setShowPlanModal(false); // 最後にモーダルを閉じる
  };

  const addToGenerationHistory = useCallback(
    (image: GeneratedImage) => {
      const imageWithAuthor = { ...image, authorName: user?.name || 'ゲスト' };
      setGenerationHistory((prev) => [
        imageWithAuthor,
        ...prev.filter((img) => img.id !== imageWithAuthor.id),
      ]);
      if (imageWithAuthor.isPublic) {
        setAllPublicImages((prevPublic) => {
          const existingIndex = prevPublic.findIndex(
            (pImg) => pImg.id === imageWithAuthor.id,
          );
          if (existingIndex > -1) {
            const updatedPublic = [...prevPublic];
            updatedPublic[existingIndex] = imageWithAuthor;
            return updatedPublic;
          }
          return [imageWithAuthor, ...prevPublic];
        });
      } else {
        setAllPublicImages((prevPublic) =>
          prevPublic.filter((pImg) => pImg.id !== imageWithAuthor.id),
        );
      }
    },
    [user],
  );

  const addToGoodsHistory = useCallback((record: GoodsCreationRecord) => {
    setGoodsCreationHistory((prev) => [record, ...prev]);
  }, []);

  const handleUpdateCredits = useCallback(
    (newCreditAmount: number) => {
      if (user) {
        setUser((prevUser) => ({ ...prevUser!, credits: newCreditAmount }));
      }
    },
    [user],
  );

  const handleLoadOptionsFromHistory = useCallback(
    (options: GenerationOptions) => {
      setOptionsToLoadInPanel(options);
      setActionAfterLoad(null);
      setShowGenerationHistoryModal(false);
      setCurrentAppView('generator');
    },
    [],
  );

  const handleExtendImageFromLibrary = useCallback(
    (imageFromLibrary: GeneratedImage) => {
      if (!user || credits < EXTEND_IMAGE_CREDIT_COST) {
        showToast(
          'error',
          `画像を拡張するためのクレジットが不足しています。（必要: ${EXTEND_IMAGE_CREDIT_COST}, 保有: ${credits}）`,
        );
        return;
      }

      const extendOptions: GenerationOptions = {
        ...imageFromLibrary.fullOptions,
        finalPromptForService: `拡張: ${imageFromLibrary.displayPrompt}`,
        creditCostForService: EXTEND_IMAGE_CREDIT_COST,
        uploadedCarImageDataUrl: imageFromLibrary.url,
        uploadedCarImageFile: undefined,
        originalUploadedImageDataUrl:
          imageFromLibrary.fullOptions.originalUploadedImageDataUrl ||
          imageFromLibrary.sourceImageUrl,
      };
      setOptionsToLoadInPanel(extendOptions);
      setActionAfterLoad('extend');
      setShowGenerationHistoryModal(false);
      setCurrentAppView('generator');
    },
    [user],
  );

  const handleActionAfterLoadPerformed = useCallback(() => {
    setActionAfterLoad(null);
  }, []);

  const handleRateImageInLibrary = useCallback(
    (imageId: string, rating: 'good' | 'bad') => {
      setGenerationHistory((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, rating } : img)),
      );
      setAllPublicImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, rating } : img)),
      );
      // セッション画像にも反映
      setGeneratedImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, rating } : img)),
      );

      showToast(
        'info',
        `画像を評価しました: ${rating === 'good' ? '良い' : '悪い'}`,
      );
    },
    [],
  );

  const handleDeleteFromLibrary = useCallback((imageId: string) => {
    setGenerationHistory((prev) => prev.filter((img) => img.id !== imageId));
    setAllPublicImages((prev) => prev.filter((img) => img.id !== imageId));
    showToast('info', `画像をライブラリから削除しました。`);
  }, []);

  const handleCreateGoodsForLibrary = useCallback(
    (item: SuzuriItem, image: GeneratedImage) => {
      if (!user || credits < item.creditCost) {
        showToast(
          'error',
          `${item.name}を作成するためのクレジットが不足しています。`,
        );
        return;
      }
      const newBalance = credits - item.creditCost;
      handleUpdateCredits(newBalance);

      const goodsRecord: GoodsCreationRecord = {
        id: `${item.id}-${Date.now()}`,
        goodsName: item.name,
        imageId: image.id,
        imageUrl: image.url,
        prompt: image.displayPrompt,
        timestamp: new Date(),
        creditCost: item.creditCost,
      };
      addToGoodsHistory(goodsRecord);
      showToast(
        'success',
        `(モック) ${item.name}をライブラリの画像から作成しました。`,
      );
    },
    [user, handleUpdateCredits, addToGoodsHistory],
  );

  const handleToggleLibraryImagePublicStatus = useCallback(
    (imageId: string, isPublic: boolean) => {
      let updatedImage: GeneratedImage | undefined;

      setGenerationHistory((prev) =>
        prev.map((img) => {
          if (img.id === imageId) {
            updatedImage = {
              ...img,
              isPublic,
              authorName: isPublic ? user?.name || 'ゲスト' : undefined,
            };
            return updatedImage;
          }
          return img;
        }),
      );

      // generatedImages 側も更新
      setGeneratedImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? {
                ...img,
                isPublic,
                authorName: isPublic ? user?.name || 'ゲスト' : undefined,
              }
            : img,
        ),
      );

      // 公開画像リスト更新
      if (updatedImage) {
        if (isPublic) {
          setAllPublicImages((prevPublic) => {
            const existingIndex = prevPublic.findIndex(
              (pImg) => pImg.id === imageId,
            );
            if (existingIndex > -1) {
              const newPublicList = [...prevPublic];
              newPublicList[existingIndex] = updatedImage!;
              return newPublicList;
            }
            return [updatedImage!, ...prevPublic];
          });
        } else {
          setAllPublicImages((prevPublic) =>
            prevPublic.filter((pImg) => pImg.id !== imageId),
          );
        }
      }

      showToast(
        'info',
        `画像の公開設定を${isPublic ? '公開' : '非公開'}に変更しました。`,
      );
    },
    [user],
  );

  const toggleAppViewMode = useCallback(() => {
    setCurrentAppView((prev) =>
      prev === 'generator' ? 'timeline' : 'generator',
    );
  }, []);

  const handleSavePersonalSettings = useCallback(
    (settings: PersonalUserSettings) => {
      if (user) {
        setUser((prevUser) => ({
          ...prevUser!,
          personalSettings: settings,
        }));
        showToast('success', '個人設定を保存しました。');
        setShowPersonalSettingsModal(false);
      }
    },
    [user],
  );

  if (shareParams && shareParams.sharedImageUrl) {
    return (
      <ShareView
        params={shareParams}
        onClose={() => {
          setShareParams(null);
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        }}
      />
    );
  }

  const renderMainContent = () => {
    if (!user) {
      return (
        <PublicTimelineView publicImages={allPublicImages} currentUser={null} />
      );
    }
    if (isAdminView) {
      return <AdminView />;
    }
    if (currentAppView === 'timeline') {
      return (
        <PublicTimelineView publicImages={allPublicImages} currentUser={user} />
      );
    }
    return (
      <UserView
        currentUser={user} // Pass full user object
        addToGenerationHistory={addToGenerationHistory}
        onAddToGoodsHistory={addToGoodsHistory}
        onUpdateCredits={handleUpdateCredits}
        menuExePanelFormData={menuExePanelFormData}
        setMenuExePanelFormData={setMenuExePanelFormData}
        generatedImages={generatedImages}
        setGeneratedImages={setGeneratedImages}
        actionToPerform={actionAfterLoad}
        onActionPerformed={handleActionAfterLoadPerformed}
        onToggleImagePublicStatus={handleToggleLibraryImagePublicStatus}
        onRateImage={handleRateImageInLibrary}
      />
    );
  };

  return (
    <ChargeOptionsProvider>
      <div className="min-h-screen flex flex-col bg-gray-900 text-gray-100">
        <Header
          user={user}
          onLoginClick={() => setShowLoginModal(true)}
          onLogoutClick={handleLogout}
          onPlansClick={() => setShowPlanModal(true)}
          onToggleAdminView={toggleView}
          isAdminView={isAdminView}
          onGenerationHistoryClick={() => setShowGenerationHistoryModal(true)}
          onGoodsHistoryClick={() => setShowGoodsHistoryModal(true)}
          currentAppView={user ? currentAppView : undefined}
          onToggleAppViewMode={user ? toggleAppViewMode : undefined}
          onPersonalSettingsClick={
            user ? () => setShowPersonalSettingsModal(true) : undefined
          } // Added
        />
        <main className="flex-grow container mx-auto px-4 py-8">
          <CategoriesProvider>
            <MenusProvider>{renderMainContent()}</MenusProvider>
          </CategoriesProvider>
        </main>

        {showLoginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
              <h2 className="text-2xl font-semibold mb-6 text-center text-indigo-400">
                ログイン / 新規登録
              </h2>
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  ユーザーID (ダミー)
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="demo_user"
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                  value={inputLoginUsername}
                  onChange={(e) => setInputLoginUsername(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  パスワード (ダミー)
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="demo_pass"
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                  value={inputLoginPassword}
                  onChange={(e) => setInputLoginPassword(e.target.value)}
                />
              </div>
              <p className="text-gray-400 mb-4 text-center text-xs">
                モックAPIによる認証が行われます。（demo_user/demo_pass）
              </p>
              <button
                onClick={handleLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
              >
                デモユーザーとしてログイン
              </button>
              <button
                onClick={() => setShowLoginModal(false)}
                className="mt-4 w-full bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        <ChargeOptionsModal
          isOpen={showPlanModal}
          onClose={() => setShowPlanModal(false)}
          onSelectPlan={handleSelectPlan}
        />
        <GenerationHistoryModal
          isOpen={showGenerationHistoryModal}
          onClose={() => setShowGenerationHistoryModal(false)}
          history={generationHistory}
          onLoadOptions={handleLoadOptionsFromHistory}
          onRateImageInLibrary={handleRateImageInLibrary}
          onDeleteFromLibrary={handleDeleteFromLibrary}
          onCreateGoodsForLibrary={handleCreateGoodsForLibrary}
          onExtendImageFromLibrary={handleExtendImageFromLibrary}
          onToggleLibraryImagePublicStatus={
            handleToggleLibraryImagePublicStatus
          }
          currentUser={user}
        />
        <GoodsCreationHistoryModal
          isOpen={showGoodsHistoryModal}
          onClose={() => setShowGoodsHistoryModal(false)}
          history={goodsCreationHistory}
        />
        {user &&
          showPersonalSettingsModal && ( // Added PersonalSettingsView modal
            <PersonalSettingsView
              currentUser={user}
              onSave={handleSavePersonalSettings}
              onClose={() => setShowPersonalSettingsModal(false)}
            />
          )}
        <ToastNotification />
      </div>
    </ChargeOptionsProvider>
  );
};

export default App;
