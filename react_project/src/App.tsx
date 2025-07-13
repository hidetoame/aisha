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
import { myGarageLogin, myGarageLogout, validateMyGarageToken } from './services/api/mygarage-auth';
import { 
  fetchTimeline, 
  saveToTimeline, 
  updateTimelineEntry, 
  deleteFromTimeline, 
  fetchPublicTimeline 
} from './services/api/library';

const App: React.FC = () => {
  const { showToast } = useToast();

  const credits = useCredits();
  const { refreshCredits } = useCreditsActions();

  const [isAdminView, setIsAdminView] = useState(false);
  const [user, setUser] = useState<User | null>(null); // Initial state set to null, login provides sample user
  const [inputLoginUsername, setInputLoginUsername] = useState('');
  const [inputLoginPassword, setInputLoginPassword] = useState('');
  const [saveLoginPassword, setSaveLoginPassword] = useState(false);
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

  // パスワード保存設定の初期化
  useEffect(() => {
    const savedUsername = localStorage.getItem('mygarage-saved-username');
    const savedPassword = localStorage.getItem('mygarage-saved-password');
    const savePasswordSetting = localStorage.getItem('mygarage-save-password');
    
    if (savePasswordSetting === 'true') {
      setSaveLoginPassword(true);
      if (savedUsername) setInputLoginUsername(savedUsername);
      if (savedPassword) setInputLoginPassword(savedPassword);
    }
  }, []);

  // ライブラリデータの読み込み
  useEffect(() => {
    if (user) {
      loadLibraryData();
      loadPublicLibraryData();
    }
  }, [user]);

  const loadLibraryData = async () => {
    if (!user?.id) return;
    try {
      // ライブラリ保存済みの画像のみを取得
      const libraryData = await fetchTimeline(user.id, true);
      setGenerationHistory(libraryData);
    } catch (error) {
      console.error('ライブラリの読み込みに失敗しました:', error);
      showToast('error', 'ライブラリの読み込みに失敗しました');
    }
  };

  const loadPublicLibraryData = async () => {
    try {
      const publicData = await fetchPublicTimeline();
      setAllPublicImages(publicData);
    } catch (error) {
      console.error('公開ライブラリの読み込みに失敗しました:', error);
    }
  };

  useEffect(() => {
    // MyGarageトークン検証でログイン状態復元
    const checkLoginStatus = async () => {
      try {
        const myGarageUser = await validateMyGarageToken();
        if (myGarageUser) {
          const aishaUser: User = {
            id: myGarageUser.id,
            name: myGarageUser.name,
            personalSettings: myGarageUser.personalSettings || {
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
          setUser(aishaUser);
          setCurrentAppView('generator');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        // エラーの場合はゲスト状態のまま
      }
    };

    checkLoginStatus();

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
      const myGarageUser = await myGarageLogin(inputLoginUsername, inputLoginPassword);
      
      if (myGarageUser) {
        // パスワード保存設定を処理
        if (saveLoginPassword) {
          localStorage.setItem('mygarage-saved-username', inputLoginUsername);
          localStorage.setItem('mygarage-saved-password', inputLoginPassword);
          localStorage.setItem('mygarage-save-password', 'true');
        } else {
          localStorage.removeItem('mygarage-saved-username');
          localStorage.removeItem('mygarage-saved-password');
          localStorage.removeItem('mygarage-save-password');
        }
        
        // MyGarageユーザーをAISHAのUser型に変換
        const aishaUser: User = {
          id: myGarageUser.id, // MyGarageから取得したユーザーID
          name: myGarageUser.name, // ← ここに取得したユーザー名を表示
          personalSettings: myGarageUser.personalSettings || {
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
        
        setUser(aishaUser);
        setShowLoginModal(false);
        setCurrentAppView('generator');
        showToast('success', `${myGarageUser.name}さん、ログインしました`);
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('error', error instanceof Error ? error.message : 'ログインエラーが発生しました');
    }
  };

  const handleDemoLogin = async () => {
    // デモユーザーの情報を自動セット
    setInputLoginUsername('demo_user');
    setInputLoginPassword('demo_pass');
    
    // MyGarage APIを使わずに直接ログイン状態にする
    const demoUser: User = {
      id: 'demo_user',
      name: 'デモユーザー',
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
    
    setUser(demoUser);
    setShowLoginModal(false);
    setCurrentAppView('generator');
    showToast('success', 'デモユーザーでログインしました');
  };

  const handleLogout = async () => {
    try {
      await myGarageLogout();
      setUser(null);
      setIsAdminView(false);
      setCurrentAppView('timeline');
      showToast('success', 'ログアウトしました');
    } catch (error) {
      console.error('Logout error:', error);
      // エラーでもログアウト状態にする
      setUser(null);
      setIsAdminView(false);
      setCurrentAppView('timeline');
      showToast('info', 'ログアウトしました');
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
    async (image: GeneratedImage) => {
      if (!user?.id) return;
      
      // 既にライブラリに保存済みかチェック
      const isAlreadySaved = generationHistory.some(
        (existingImage) => existingImage.id === image.id
      );
      
      if (isAlreadySaved) {
        showToast('info', 'この画像は既にライブラリに保存されています');
        return;
      }
      
      const imageWithAuthor = { ...image, authorName: user?.name || 'ゲスト' };
      
      try {
        // タイムラインAPIに保存（ライブラリフラグ=trueで保存）
        const savedImage = await saveToTimeline(user.id, { ...imageWithAuthor, isSavedToLibrary: true });
        if (savedImage) {
          // ローカルステートも更新
          setGenerationHistory((prev) => [
            savedImage,
            ...prev.filter((img) => img.id !== savedImage.id),
          ]);
          
          // 公開画像の場合は公開リストも更新
          if (savedImage.isPublic) {
            setAllPublicImages((prevPublic) => {
              const existingIndex = prevPublic.findIndex(
                (pImg) => pImg.id === savedImage.id,
              );
              if (existingIndex > -1) {
                const updatedPublic = [...prevPublic];
                updatedPublic[existingIndex] = savedImage;
                return updatedPublic;
              }
              return [savedImage, ...prevPublic];
            });
          } else {
            setAllPublicImages((prevPublic) =>
              prevPublic.filter((pImg) => pImg.id !== savedImage.id),
            );
          }
          
          showToast('success', 'ライブラリに保存されました');
        }
      } catch (error: any) {
        console.error('ライブラリ保存に失敗しました:', error);
        
        // 重複エラーの場合は特別なメッセージを表示
        if (error?.response?.status === 400 && 
            error?.response?.data?.error?.includes?.('unique') ||
            error?.response?.data?.error?.includes?.('重複')) {
          showToast('info', 'この画像は既にライブラリに保存されています');
        } else {
          showToast('error', 'ライブラリへの保存に失敗しました');
        }
        
        // エラーの場合はローカルステートのみ更新
        setGenerationHistory((prev) => [
          imageWithAuthor,
          ...prev.filter((img) => img.id !== imageWithAuthor.id),
        ]);
      }
    },
    [user, showToast],
  );

  // 画像生成時にタイムラインに自動保存（ライブラリフラグ=false）
  const saveToTimelineOnGeneration = useCallback(
    async (image: GeneratedImage) => {
      if (!user?.id) return;
      
      const imageWithAuthor = { ...image, authorName: user?.name || 'ゲスト' };
      
      try {
        // タイムラインAPIに保存（ライブラリフラグ=falseで保存）
        const savedImage = await saveToTimeline(user.id, { ...imageWithAuthor, isSavedToLibrary: false });
        if (savedImage) {
          console.log('✅ タイムラインに保存されました:', savedImage.id);
        }
      } catch (error: any) {
        console.error('❌ タイムライン保存に失敗しました:', error);
        // タイムライン保存に失敗してもエラートーストは出さない（ユーザー体験を損なわないため）
      }
    },
    [user],
  );

  // 既存画像をライブラリに保存する専用関数
  const saveExistingImageToLibrary = useCallback(
    async (image: GeneratedImage) => {
      if (!user?.id) return;
      
      console.log('🔍 ライブラリ保存開始:', { imageId: image.id, currentFlag: image.isSavedToLibrary });
      
      try {
        // 既存画像のライブラリフラグを更新
        const updatedImage = await updateTimelineEntry(user.id, image.id, { 
          isSavedToLibrary: true 
        });
        
        console.log('✅ API更新成功:', updatedImage);
        
        if (updatedImage) {
          // セッション画像のライブラリフラグを更新
          setGeneratedImages((prev) =>
            prev.map((img) => 
              img.id === image.id 
                ? { ...img, isSavedToLibrary: true }
                : img
            ),
          );
          
          // ライブラリ履歴を再読み込み
          loadLibraryData();
          
          showToast('success', 'ライブラリに保存されました');
        }
      } catch (error: any) {
        console.error('❌ ライブラリ保存に失敗しました:', error);
        showToast('error', 'ライブラリへの保存に失敗しました');
      }
    },
    [user, showToast],
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
    async (imageId: string, rating: 'good' | 'bad') => {
      if (!user?.id) return;
      
      try {
        // ライブラリAPIで評価を更新
        const updatedImage = await updateTimelineEntry(user.id, imageId, { rating });
        if (updatedImage) {
          // ローカルステートも更新
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
        }
      } catch (error) {
        console.error('評価の更新に失敗しました:', error);
        showToast('error', '評価の更新に失敗しました');
      }
    },
    [user, showToast],
  );

  const handleDeleteFromLibrary = useCallback(async (imageId: string) => {
    if (!user?.id) return;
    
    try {
      const success = await deleteFromTimeline(user.id, imageId);
      if (success) {
        setGenerationHistory((prev) => prev.filter((img) => img.id !== imageId));
        setAllPublicImages((prev) => prev.filter((img) => img.id !== imageId));
        showToast('info', `画像をライブラリから削除しました。`);
      }
    } catch (error) {
      console.error('削除に失敗しました:', error);
      showToast('error', '削除に失敗しました');
    }
  }, [user, showToast]);

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
    async (imageId: string, isPublic: boolean) => {
      if (!user?.id) return;
      
      try {
        const authorName = isPublic ? user?.name || 'ゲスト' : undefined;
        const updatedImageFromAPI = await updateTimelineEntry(user.id, imageId, { 
          isPublic, 
          authorName 
        });
        
        if (updatedImageFromAPI) {
          // ローカルステート更新
          setGenerationHistory((prev) =>
            prev.map((img) => 
              img.id === imageId 
                ? { ...img, isPublic, authorName }
                : img
            ),
          );

          // generatedImages 側も更新
          setGeneratedImages((prev) =>
            prev.map((img) =>
              img.id === imageId
                ? { ...img, isPublic, authorName }
                : img,
            ),
          );

          // 公開画像リスト更新
          if (isPublic) {
            setAllPublicImages((prevPublic) => {
              const existingIndex = prevPublic.findIndex(
                (pImg) => pImg.id === imageId,
              );
              if (existingIndex > -1) {
                const newPublicList = [...prevPublic];
                newPublicList[existingIndex] = { ...updatedImageFromAPI, authorName };
                return newPublicList;
              }
              return [{ ...updatedImageFromAPI, authorName }, ...prevPublic];
            });
          } else {
            setAllPublicImages((prevPublic) =>
              prevPublic.filter((pImg) => pImg.id !== imageId),
            );
          }

          showToast(
            'info',
            `画像の公開設定を${isPublic ? '公開' : '非公開'}に変更しました。`,
          );
        }
      } catch (error) {
        console.error('公開設定の更新に失敗しました:', error);
        showToast('error', '公開設定の更新に失敗しました');
      }
    },
    [user, showToast],
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
        showToast('success', '愛車設定を保存しました。');
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
        saveToTimelineOnGeneration={saveToTimelineOnGeneration}
        saveExistingImageToLibrary={saveExistingImageToLibrary}
        onAddToGoodsHistory={addToGoodsHistory}
        onUpdateCredits={handleUpdateCredits}
        menuExePanelFormData={menuExePanelFormData}
        setMenuExePanelFormData={setMenuExePanelFormData}
        generatedImages={generatedImages}
        setGeneratedImages={setGeneratedImages}
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
                MyGarage ログイン
              </h2>
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  メールアドレス
                </label>
                <input
                  type="email"
                  id="username"
                  name="username"
                  placeholder="MyGarageのメールアドレス"
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
                  パスワード
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="MyGarageのパスワード"
                  className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                  value={inputLoginPassword}
                  onChange={(e) => setInputLoginPassword(e.target.value)}
                />
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="savePassword"
                  checked={saveLoginPassword}
                  onChange={(e) => setSaveLoginPassword(e.target.checked)}
                  className="mr-2 h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="savePassword" className="text-sm text-gray-300">
                  ログインパスワードを保存する
                </label>
              </div>
              <p className="text-gray-400 mb-4 text-center text-xs">
                MyGarageアカウントのメールアドレスでログインします
              </p>
              <button
                onClick={handleLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out mb-3"
              >
                MyGarageでログイン
              </button>
              
              <div className="relative mb-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gray-800 px-2 text-gray-500">開発用</span>
                </div>
              </div>
              
              <button
                onClick={handleDemoLogin}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out mb-3"
              >
                デモユーザーでログイン
              </button>
              
              <button
                onClick={() => setShowLoginModal(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
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
