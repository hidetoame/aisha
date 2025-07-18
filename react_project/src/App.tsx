import React, { useState, useCallback, useEffect } from 'react';
import UserView from './views/UserView';
import AdminView from './views/AdminView';
import PublicTimelineView from './views/PublicTimelineView';
import { Header } from './components/Header';
import { GenerationHistoryModal } from './components/modals/GenerationHistoryModal';
import { GoodsCreationHistoryModal } from './components/modals/GoodsCreationHistoryModal';
import { PaymentHistoryModal } from './components/modals/PaymentHistoryModal'; // Added
import { DirectionSelectionModal } from './components/modals/DirectionSelectionModal';
import PersonalSettingsView from './views/PersonalSettingsView'; // Added
import { ToastNotification } from './components/ToastNotification'; // Added
import { ShareView } from './views/ShareView';
import FirebasePhoneLoginModal from './components/modals/FirebasePhoneLoginModal'; // Firebase SMS authentication
import AwsSmsLoginModal from './components/modals/AwsSmsLoginModal'; // AWS SMS authentication
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getCurrentUserIdToken, signOutFirebase } from './services/api/firebase-auth';
import { suzuriApiClient, SuzuriGoodsHistoryItem } from './services/suzuriApi';
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
  AnchorPosition,
  PersonalUserSettings,
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
import { consumeCredits } from './services/api/credits';
import { myGarageLogin, myGarageLogout, validateMyGarageToken } from './services/api/mygarage-auth';
import { 
  fetchTimeline, 
  saveToTimeline, 
  updateTimelineEntry, 
  deleteFromTimeline, 
  fetchPublicTimeline 
} from './services/api/library';
import { expandImage } from './services/api/image-expansion';

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
  const [showPhoneLoginModal, setShowPhoneLoginModal] = useState(false); // Added
  const [showAwsSmsLoginModal, setShowAwsSmsLoginModal] = useState(false); // AWS SMS Login Modal

  const [generationHistory, setGenerationHistory] = useState<GeneratedImage[]>(
    [],
  );
  const [goodsCreationHistory, setGoodsCreationHistory] = useState<
    GoodsCreationRecord[]
  >([]);
  const [showGenerationHistoryModal, setShowGenerationHistoryModal] =
    useState(false);
  const [showGoodsHistoryModal, setShowGoodsHistoryModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false); // Added
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
  
  // ライブラリから拡張時のローディング状態
  const [isLibraryExtending, setIsLibraryExtending] = useState(false);
  const [currentAppView, setCurrentAppView] =
    useState<AppViewMode>('generator');

  // 拡張方向選択モーダル関連のstate
  const [isDirectionModalOpen, setIsDirectionModalOpen] = useState(false);
  const [imageToExpand, setImageToExpand] = useState<GeneratedImage | null>(null);

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

  // 初期化時のトークン検証
  useEffect(() => {
    const validateTokens = async () => {
      // Firebase認証状態の監視
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch('/api/firebase-auth/validate', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${idToken}`,
              },
            });
            
            const data = await response.json();
            if (data.success && data.user) {
              const phoneUser: User = {
                id: data.user.id,
                name: data.user.nickname,
                loginType: 'phone',
                phoneNumber: data.user.phoneNumber,
                isAdmin: data.user.isAdmin || false,
              };
              setUser(phoneUser);
              setCurrentAppView('generator');
              return;
            }
          } catch (error) {
            // Firebase認証エラーの場合、サイレントにログアウト
            setUser(null);
            try {
              await signOutFirebase();
            } catch (signOutError) {
              // サインアウトエラーも無視
            }
          }
        } else {
          // Firebase認証が無い場合、MyGarageトークンを確認
          try {
            const myGarageUser = await validateMyGarageToken();
            if (myGarageUser) {
              const aishaUser: User = {
                id: myGarageUser.id,
                name: myGarageUser.name,
                isAdmin: myGarageUser.isAdmin,
                personalSettings: myGarageUser.personalSettings,
                loginType: 'mygarage',
              };
              setUser(aishaUser);
              setCurrentAppView('generator');
            }
          } catch (error) {
            // MyGarageトークンエラーも無視
          }
        }
      });

      // クリーンアップ関数を返す
      return () => unsubscribe();
    };

    validateTokens();
  }, []);

  // ライブラリデータの読み込み
  useEffect(() => {
    if (user) {
      loadLibraryData();
      loadPublicLibraryData();
      loadUserGenerationHistory(); // ユーザーの全生成履歴を読み込み
    }
  }, [user]);

  const loadLibraryData = async () => {
    if (!user?.id) return;
    try {
      // ライブラリ保存済みの画像のみ取得
      const libraryData = await fetchTimeline(user.id, true);
      setGenerationHistory(libraryData);
    } catch (error) {
      console.error('ライブラリの読み込みに失敗しました:', error);
      showToast('error', 'ライブラリの読み込みに失敗しました');
    }
  };

  const loadUserGenerationHistory = async () => {
    if (!user?.id) return;
    try {
      // ユーザーの全ての生成履歴を取得（右側パネル表示用）
      const allUserImages = await fetchTimeline(user.id, false);
      setGeneratedImages(allUserImages);
    } catch (error) {
      console.error('生成履歴の読み込みに失敗しました:', error);
      showToast('error', '生成履歴の読み込みに失敗しました');
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
            isAdmin: myGarageUser.isAdmin, // 🔧 管理者フラグを追加！
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
            }
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
    
    // 初回の公開タイムラインを読み込み
    loadPublicLibraryData();
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
    if (user) refreshCredits(user.id);
  }, [user]);

  // SuzuriGoodsHistoryItemをGoodsCreationRecordに変換する関数
  const convertToGoodsCreationRecord = (item: SuzuriGoodsHistoryItem): GoodsCreationRecord => {
    return {
      id: item.id.toString(),
      goodsName: item.product_title,
      imageId: item.library_image_id,
      imageUrl: item.sample_image_url, // SUZURI商品のプレビュー画像をサムネイルに使用
      prompt: item.description || item.car_name,
      timestamp: new Date(item.created_at),
      creditCost: 0, // APIレスポンスにない場合は0
      selectedVariations: {
        itemType: item.item_name,
        productId: item.product_id.toString(),
        productUrl: item.product_url,
        originalImageUrl: item.original_image_url, // 元画像URLはselectedVariationsに保存
      }
    };
  };

  // グッズ履歴を取得する関数（独立）
  const loadGoodsHistory = async () => {
    if (user?.id) {
      try {
        console.log('📦 グッズ履歴を取得中... user_id:', user.id);
        const historyData = await suzuriApiClient.getUserGoodsHistory(user.id);
        console.log('✅ グッズ履歴取得成功:', historyData);
        
        const convertedHistory = historyData.map(convertToGoodsCreationRecord);
        setGoodsCreationHistory(convertedHistory);
      } catch (error) {
        console.error('❌ グッズ履歴取得エラー:', error);
        // エラーの場合は空配列を設定
        setGoodsCreationHistory([]);
      }
    }
  };

  // グッズ履歴を取得するuseEffect
  useEffect(() => {
    if (showGoodsHistoryModal) {
      loadGoodsHistory();
    }
  }, [showGoodsHistoryModal, user?.id]);

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
          isAdmin: myGarageUser.isAdmin, // 🔧 管理者フラグを追加！
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
          }
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

  const handlePhoneLogin = () => {
    setShowLoginModal(false);
    setShowPhoneLoginModal(true);
  };

  const handleAwsSmsLogin = () => {
    setShowLoginModal(false);
    setShowAwsSmsLoginModal(true);
  };

  const handlePhoneLoginSuccess = (user: User) => {
    setUser(user);
    setShowPhoneLoginModal(false);
    setCurrentAppView('generator');
    showToast('success', 'ログインしました');
  };

  const handlePhoneLoginError = (message: string) => {
    showToast('error', message);
  };

  const handleAwsSmsLoginSuccess = (user: User) => {
    setUser(user);
    setShowAwsSmsLoginModal(false);
    setCurrentAppView('generator');
    showToast('success', 'AWS SMS認証でログインしました');
  };

  const handleAwsSmsLoginError = (message: string) => {
    showToast('error', message);
  };

  const handleLogout = async () => {
    try {
      // ログインタイプに応じてログアウト処理を変更
      if (user?.loginType === 'phone') {
        await signOutFirebase();
      } else {
        await myGarageLogout();
      }
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

    // Stripe決済は既にChargeOptionsModal内で完了しているため、
    // ここではクレジット残高の更新のみ行う
    refreshCredits(user.id);
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
      
      try {
        // 既存画像のライブラリフラグを更新
        const updatedImage = await updateTimelineEntry(user.id, image.id, { 
          isSavedToLibrary: true 
        });
        
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
    (formData: MenuExecutionFormData, generatedImageUrl?: string) => {
      // ライブラリからの画像読み込み要求をactionAfterLoadとして設定
      setActionAfterLoad({
        type: 'loadFromLibrary',
        formData,
        generatedImageUrl,
      });
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

      // 拡張方向選択モーダルを開く（ライブラリの詳細ビューは保持したまま）
      setImageToExpand(imageFromLibrary);
      setIsDirectionModalOpen(true);
      // ライブラリモーダルとビューはそのまま保持
    },
    [user, credits, showToast],
  );

  // 拡張方向選択モーダルのコールバック関数
  const handleDirectionModalClose = useCallback(() => {
    setIsDirectionModalOpen(false);
    setImageToExpand(null);
  }, []);

  const handleDirectionModalConfirm = useCallback(async (anchorPosition: AnchorPosition) => {
    if (!imageToExpand || !user) {
      showToast('error', '画像拡張の準備ができていません。');
      return;
    }

    // 拡張処理開始：ライブラリモーダルを閉じてジェネレータービューに切り替え
    setShowGenerationHistoryModal(false);
    setCurrentAppView('generator');
    setIsLibraryExtending(true); // ローディング開始

    try {
      // クレジット消費
      const reqBody = { 
        credits: EXTEND_IMAGE_CREDIT_COST,
        user_id: user.id 
      };
      const onError = () =>
        showToast('error', 'クレジット消費に失敗しました（画像拡張は成功）');
      await consumeCredits(reqBody, onError);
      refreshCredits(user.id);
      
      // 画像拡張API呼び出し
      const expandedImage = await expandImage(
        imageToExpand.id,
        anchorPosition,
        user.id,
        (error) => {
          console.error('画像拡張エラー:', error);
          showToast('error', error instanceof Error ? error.message : '画像拡張に失敗しました');
        }
      );

      if (expandedImage) {
        // 生成履歴に追加（バックエンドで既にタイムラインに保存済み）
        setGenerationHistory(prev => [expandedImage, ...prev]);
        // ジェネレータービューの生成画像リストにも追加
        setGeneratedImages(prev => [expandedImage, ...prev]);
        
        showToast('success', '画像の拡張が完了しました！');
        // 既にジェネレータービューに切り替え済み
      }
    } catch (error) {
      console.error('画像拡張処理エラー:', error);
      showToast('error', '画像拡張処理中にエラーが発生しました');
    } finally {
      handleDirectionModalClose();
      setIsLibraryExtending(false); // ローディング終了
    }
  }, [imageToExpand, user, refreshCredits, showToast, setGenerationHistory, handleDirectionModalClose]);

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

  // 決済履歴モーダルのハンドラー
  const handlePaymentHistoryClick = useCallback(() => {
    setShowPaymentHistoryModal(true);
  }, [user]);

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
        onReloadUserHistory={loadUserGenerationHistory}
        isLibraryExtending={isLibraryExtending} // ライブラリ拡張中の状態を渡す
        actionAfterLoad={actionAfterLoad} // ライブラリからの読み込み処理を渡す
        onActionAfterLoadPerformed={handleActionAfterLoadPerformed} // 処理完了コールバック
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
          }
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
                onClick={handlePhoneLogin}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out mb-3"
              >
                電話番号でログイン (Firebase)
              </button>
              
              <button
                onClick={handleAwsSmsLogin}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out mb-3"
              >
                電話番号でログイン (AWS SMS)
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
          currentUser={user}
          onPaymentHistoryClick={handlePaymentHistoryClick}
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
          currentUser={user}
          onGoodsCreated={() => {
            console.log('🔄 App.tsx - グッズ作成完了通知受信、履歴を再取得します');
            loadGoodsHistory();
          }}
        />
        
        {/* 決済履歴モーダル */}
        <PaymentHistoryModal
          isOpen={showPaymentHistoryModal}
          onClose={() => setShowPaymentHistoryModal(false)}
          currentUser={user}
        />
        
        {/* 拡張方向選択モーダル */}
        <DirectionSelectionModal
          isOpen={isDirectionModalOpen}
          onClose={handleDirectionModalClose}
          onConfirm={handleDirectionModalConfirm}
          imageName={imageToExpand?.displayPrompt || '画像'}
        />
        {user &&
          showPersonalSettingsModal && ( // Added PersonalSettingsView modal
            <PersonalSettingsView
              currentUser={user}
              onSave={handleSavePersonalSettings}
              onClose={() => setShowPersonalSettingsModal(false)}
            />
          )}
        
        {/* Firebase電話番号ログインモーダル */}
        <FirebasePhoneLoginModal
          isOpen={showPhoneLoginModal}
          onClose={() => setShowPhoneLoginModal(false)}
          onLoginSuccess={handlePhoneLoginSuccess}
          onError={handlePhoneLoginError}
        />
        
        {/* AWS SMS認証ログインモーダル */}
        <AwsSmsLoginModal
          isOpen={showAwsSmsLoginModal}
          onClose={() => setShowAwsSmsLoginModal(false)}
          onLoginSuccess={handleAwsSmsLoginSuccess}
          onError={handleAwsSmsLoginError}
        />
        
        <ToastNotification />
      </div>
    </ChargeOptionsProvider>
  );
};

export default App;
