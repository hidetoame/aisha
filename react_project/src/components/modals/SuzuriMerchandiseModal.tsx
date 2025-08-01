import React, { useState, useEffect } from 'react';
import { GeneratedImage, User } from '@/types';
import { suzuriApiClient } from '@/services/suzuriApi';
import { getPublicGoodsList, GoodsManagementItem } from '@/services/api/goods-management';
import {
  XMarkIcon as CloseIcon,
  ArrowPathIcon,
  ShoppingBagIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  StarIcon,
  ArrowLeftIcon,
  EyeIcon,
} from '../icons/HeroIcons';

interface ExistingProductData {
  selectedItemId: string;
  merchandiseResult: MerchandiseResult;
}

interface SuzuriMerchandiseModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImage;
  currentUser?: User | null; // ユーザー情報を追加
  onGoodsCreated?: () => void; // グッズ作成成功時のコールバック
  initialStep?: 'select' | 'preview' | 'result'; // 初期ステップ（デフォルト: 'select'）
  existingProductData?: ExistingProductData; // 既存商品データ（履歴から開く場合）
}

interface MerchandiseResult {
  success: boolean;
  productUrl?: string;
  product_url?: string;  // バックエンドからの互換性
  productTitle?: string;
  product_title?: string;  // バックエンドからの互換性
  sampleImageUrl?: string;
  sample_image_url?: string;  // バックエンドからの互換性
  itemName?: string;
  item_name?: string;  // バックエンドからの互換性
  productId?: number;
  product_id?: number;  // バックエンドからの互換性
  materialId?: number;
  material_id?: number;  // バックエンドからの互換性
  error?: string;
}

interface ItemOption {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  icon_url?: string | null; // SUZURIのアイコン画像URL
  sample_image_url?: string | null; // SUZURIのサンプル画像URLを追加
  basePrice: number;
  finalPrice: number;
  description: string;
  gradient: string;
  suzuriItemId: number;
  isPublic: boolean;
  displayOrder: number;
  descriptions: string[];
  availablePrintPlaces: string[];
  isMultiPrintable: boolean;
  itemType: string; // SUZURI APIで使用する商品タイプ
  apiConfig: { // SUZURI API設定
    itemId?: number;
    exemplaryItemVariantId?: number;
    sub_materials?: Array<{
      printSide: string;
    }>;
    resizeMode?: string;
  };
}

export const SuzuriMerchandiseModal: React.FC<SuzuriMerchandiseModalProps> = ({
  isOpen,
  onClose,
  image,
  currentUser,
  onGoodsCreated,
  initialStep = 'select',
  existingProductData,
}) => {
  const [goodsItems, setGoodsItems] = useState<ItemOption[]>([]);
  const [isLoadingGoods, setIsLoadingGoods] = useState(false);

  // 公開グッズ一覧を取得
  useEffect(() => {
    const loadPublicGoods = async () => {
      setIsLoadingGoods(true);
      try {
        const publicGoods = await getPublicGoodsList();
        const convertedItems: ItemOption[] = publicGoods.map(goods => {
          // アイテム種類に応じてアイコンとグラデーションを設定
          const getItemIcon = (itemName: string) => {
            const iconMap: { [key: string]: string } = {
              'dry-t-shirt': '👕',
              'smartphone-case': '📱',
              'android-smartphone-case': '📱',
              'big-shoulder-bag': '👜',
              'thermo-tumbler': '🥤',
              'sticker': '🏷️',
              'clear-file-folder': '📁',
            };
            return iconMap[itemName] || '📦';
          };

          const getItemGradient = (itemName: string) => {
            const gradientMap: { [key: string]: string } = {
              'dry-t-shirt': 'from-blue-400 to-blue-600',
              'smartphone-case': 'from-purple-400 to-purple-600',
              'android-smartphone-case': 'from-purple-400 to-purple-600',
              'big-shoulder-bag': 'from-green-400 to-green-600',
              'thermo-tumbler': 'from-orange-400 to-orange-600',
              'sticker': 'from-yellow-400 to-yellow-600',
              'clear-file-folder': 'from-indigo-400 to-indigo-600',
            };
            return gradientMap[itemName] || 'from-blue-400 to-blue-600';
          };

          return {
            id: goods.item_name,
            name: goods.item_name,
            displayName: goods.display_name,
            icon: getItemIcon(goods.item_name), // フォールバック用の絵文字アイコン
            icon_url: goods.icon_url, // SUZURIのアイコン画像URL
            sample_image_url: goods.sample_image_url, // SUZURIのサンプル画像URL
            basePrice: goods.base_price,
            finalPrice: goods.final_price,
            description: goods.descriptions?.join(', ') || '',
            gradient: getItemGradient(goods.item_name),
            suzuriItemId: goods.suzuri_item_id,
            isPublic: goods.is_public,
            displayOrder: goods.display_order,
            descriptions: goods.descriptions || [],
            availablePrintPlaces: goods.available_print_places || [],
            isMultiPrintable: goods.is_multi_printable,
            itemType: goods.item_type || goods.item_name, // 管理画面のitem_typeを使用
            apiConfig: goods.api_config || { itemId: goods.suzuri_item_id, exemplaryItemVariantId: null, sub_materials: [], resizeMode: 'cover' }, // 管理画面のapi_configを使用
          };
        });
        
        // デバッグログ: 取得した商品一覧を確認
        console.log('🔄 公開商品一覧:', convertedItems.map(item => ({
          id: item.id,
          displayName: item.displayName,
          itemType: item.itemType,
          suzuriItemId: item.suzuriItemId,
          apiConfig: item.apiConfig
        })));
        
        setGoodsItems(convertedItems);
      } catch (error) {
        console.error('公開グッズ一覧取得エラー:', error);
      } finally {
        setIsLoadingGoods(false);
      }
    };

    if (isOpen) {
      loadPublicGoods();
    }
  }, [isOpen]);

  // 既存商品データがある場合は、そのアイテムを初期選択する
  const getInitialSelectedItem = () => {
    if (existingProductData) {
      return goodsItems.find(item => item.id === existingProductData.selectedItemId) || null;
    }
    return null;
  };

  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(getInitialSelectedItem());
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<MerchandiseResult | null>(existingProductData?.merchandiseResult || null);
  const [step, setStep] = useState<'select' | 'preview' | 'result'>(initialStep);
  const [previewAnimation, setPreviewAnimation] = useState(false);

  // デバッグ: previewステップの条件チェック
  const checkPreviewCondition = () => {
    const stepCheck = step === 'preview';
    const itemCheck = selectedItem !== null;
    const result = stepCheck && itemCheck;
    return result;
  };

  useEffect(() => {
    if (step === 'preview') {
      setPreviewAnimation(true);
      const timer = setTimeout(() => setPreviewAnimation(false), 300);
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!isOpen) return null;

  // 車の名前を抽出
  const extractCarName = (prompt: string): string => {
    if (!prompt) return 'AISHA生成画像';
    
    // 技術的なプレフィックスを除去
    let cleanPrompt = prompt
      .replace(/^背景拡張[:：]\s*/g, '')
      .replace(/^Please take photos of the car[^.]*\./g, '')
      .replace(/^画像拡張[:：]\s*/g, '')
      .replace(/^Extension[:：]\s*/g, '');
    
    // 車種名のキーワードを探す
    const carKeywords = [
      'NISSAN', 'TOYOTA', 'HONDA', 'MAZDA', 'SUBARU', 'MITSUBISHI',
      'BMW', 'MERCEDES', 'AUDI', 'VOLKSWAGEN', 'PORSCHE',
      'FERRARI', 'LAMBORGHINI', 'MASERATI',
      'FORD', 'CHEVROLET', 'DODGE', 'TESLA',
      'FAIRLADY', 'SUPRA', 'CIVIC', 'ACCORD', 'SKYLINE', 'GT-R'
    ];
    
    for (const keyword of carKeywords) {
      if (cleanPrompt.toUpperCase().includes(keyword)) {
        const index = cleanPrompt.toUpperCase().indexOf(keyword);
        const start = Math.max(0, index - 10);
        const end = Math.min(cleanPrompt.length, index + keyword.length + 20);
        return cleanPrompt.slice(start, end).trim();
      }
    }
    
    // 車種名が見つからない場合は、最初の50文字を使用
    return cleanPrompt.slice(0, 50).trim() || 'AISHA生成画像';
  };

  const _get_item_display_name = (item_name: string, requested_type: string) => {
    const display_names: Record<string, string> = {
      'dry-t-shirt': 'ドライTシャツ',
      'smartphone-case': 'iPhoneケース',
      'big-shoulder-bag': 'ショルダーバッグ',
      'thermo-tumbler': 'タンブラー',
      'sticker': 'ステッカー',
      'clear-file-folder': 'クリアファイル',
    };
    
    // requested_typeから優先的に表示名を取得
    if (requested_type in display_names) {
      return display_names[requested_type];
    }
    
    // item_nameから表示名を取得
    if (item_name in display_names) {
      return display_names[item_name];
    }
    
    // マッピングにない場合はそのまま返す
    return item_name || 'グッズ';
  };

  // アイテムタイプ別の価格を取得する関数
  const getItemPrice = (itemType: string): string => {
    const priceMapping: Record<string, string> = {
      'dry-t-shirt': '¥5,100〜',
      'smartphone-case': '¥3,000〜',
      'big-shoulder-bag': '¥5,000〜',
      'thermo-tumbler': '¥4,100〜',
      'sticker': '¥1,100〜',
      'clear-file-folder': '¥2,200〜',
    };
    
    return priceMapping[itemType] || '¥5,100〜';
  };

  const carName = extractCarName(image.displayPrompt);

  const handleItemSelect = (item: ItemOption) => {
    // デバッグログ: 選択された商品の詳細を確認
    console.log('🔄 商品選択:', {
      id: item.id,
      displayName: item.displayName,
      itemType: item.itemType,
      suzuriItemId: item.suzuriItemId,
      apiConfig: item.apiConfig
    });
    
    setSelectedItem(item);
    setStep('preview');
  };

  const handleCreate = async () => {
    if (!selectedItem) return;

    setIsCreating(true);
    setStep('result');

    try {
      const requestData = {
        image_url: image.url,
        car_name: carName,
        description: `${carName} ${selectedItem.displayName}`,
        item_type: selectedItem.itemType, // 管理画面のitem_typeを使用
        item_id: selectedItem.suzuriItemId,  // SUZURIアイテムIDを追加
        user_id: currentUser?.id,  // ユーザーIDを追加
        additional_profit: selectedItem.finalPrice - selectedItem.basePrice,  // 追加利益を追加
        print_places: selectedItem.availablePrintPlaces,  // プリント位置を追加
        is_multi_printable: selectedItem.isMultiPrintable,  // マルチプリント可能フラグを追加
        api_config: selectedItem.apiConfig, // 管理画面のAPI設定を追加
      };

      // デバッグログ: 送信データを確認
      console.log('🔄 SUZURI API リクエストデータ:', {
        item_type: requestData.item_type,
        item_id: requestData.item_id,
        api_config: requestData.api_config,
        selectedItem: {
          id: selectedItem.id,
          displayName: selectedItem.displayName,
          itemType: selectedItem.itemType,
          apiConfig: selectedItem.apiConfig
        }
      });

      const response = await suzuriApiClient.createMerchandise(requestData);
      setResult(response);
      
      // グッズ作成成功時にコールバックを呼び出し
      if (response.success && onGoodsCreated) {
        onGoodsCreated();
      }
    } catch (error: any) {
      console.error('SUZURI merchandise creation failed:', error);
      
      let errorMessage = 'グッズ作成中にエラーが発生しました';
      if (error.message.includes('API Error: 400')) {
        errorMessage = 'リクエストの形式が正しくありません。画像または車名に問題があります。';
      } else if (error.message.includes('API Error: 401')) {
        errorMessage = 'SUZURI APIの認証に失敗しました。管理者に問い合わせてください。';
      } else if (error instanceof Error) {
        errorMessage = `エラー: ${error.message}`;
      }
      
      setResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleBack = () => {
    if (step === 'preview') {
      setStep('select');
      setSelectedItem(null);
    } else if (step === 'result') {
      setStep('select');
      setSelectedItem(null);
      setResult(null);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedItem(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* シンプルなヘッダー */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 p-1.5 hover:bg-white hover:bg-opacity-20 rounded-full transition-all duration-200"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
          
          <div className="pr-10">
            <div className="flex items-center space-x-2">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <ShoppingBagIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  オリジナルグッズ作成
                </h2>
                <p className="text-pink-100 text-sm">
                  あなただけの特別なアイテムを作ろう
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* シンプルな進行状況インジケーター */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              step === 'select' ? 'text-purple-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'select' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <span className="text-sm font-medium">アイテム選択</span>
            </div>
            
            <div className="w-8 h-1 bg-gray-200 rounded-full">
              <div className={`h-full bg-purple-400 rounded-full transition-all duration-500 ${
                step !== 'select' ? 'w-full' : 'w-0'
              }`}></div>
            </div>
            
            <div className={`flex items-center space-x-2 ${
              step === 'preview' ? 'text-purple-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'preview' 
                  ? 'bg-purple-600 text-white' 
                  : step === 'result' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-600'
              }`}>
                {step === 'result' ? <CheckIcon className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-sm font-medium">プレビュー</span>
            </div>
            
            <div className="w-8 h-1 bg-gray-200 rounded-full">
              <div className={`h-full bg-purple-400 rounded-full transition-all duration-500 ${
                step === 'result' ? 'w-full' : 'w-0'
              }`}></div>
            </div>
            
            <div className={`flex items-center space-x-2 ${
              step === 'result' ? 'text-purple-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === 'result' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step === 'result' ? <CheckIcon className="w-4 h-4" /> : '3'}
              </div>
              <span className="text-sm font-medium">完成</span>
            </div>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {step === 'select' && (
            <div className="space-y-8">
              {/* シンプルな画像プレビュー */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100 shadow-sm">
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <img
                      src={image.url}
                      alt="生成画像"
                      className="w-20 h-20 object-cover rounded-xl shadow-md border-2 border-white"
                    />
                  </div>
                </div>
              </div>

              {/* シンプルなセクションタイトル */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center justify-center">
                  <ShoppingBagIcon className="w-5 h-5 text-purple-500 mr-2" />
                  作成するグッズを選択してください
                </h3>
              </div>

              {/* シンプルなグッズ選択グリッド */}
              {isLoadingGoods ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-gray-600">グッズ一覧を読み込み中...</span>
                </div>
              ) : goodsItems.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {goodsItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemSelect(item);
                      }}
                      className="group p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-md transition-all duration-200 text-center"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-lg flex items-center justify-center text-xl mb-2 mx-auto group-hover:scale-105 transition-transform duration-200`}>
                        {item.sample_image_url ? (
                          <img src={item.sample_image_url} alt={item.displayName} className="w-full h-full object-contain rounded-md" />
                        ) : item.icon_url ? (
                          <img src={item.icon_url} alt={item.displayName} className="w-full h-full object-contain rounded-md" />
                        ) : (
                          item.icon
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-800 text-sm">
                        {item.displayName}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        ¥{item.finalPrice.toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">公開されているグッズがありません</p>
                </div>
              )}

              {/* シンプルな注意事項 */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <div className="flex items-start space-x-2">
                  <div className="text-blue-500 mt-0.5">💡</div>
                  <div>
                    <p className="text-blue-800 font-semibold text-sm mb-1">SUZURIについて</p>
                    <p className="text-blue-700 text-xs leading-relaxed">
                      作成後、SUZURIのサイトで安全にお買い物ができます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && selectedItem && (
            <div className="space-y-6">
              {/* シンプルなアイテムヘッダー */}
              <div className="text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${selectedItem.gradient} rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4`}>
                  {selectedItem.sample_image_url ? (
                    <img src={selectedItem.sample_image_url} alt={selectedItem.displayName} className="w-full h-full object-contain" />
                  ) : selectedItem.icon_url ? (
                    <img src={selectedItem.icon_url} alt={selectedItem.displayName} className="w-full h-full object-contain" />
                  ) : (
                    selectedItem.icon
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {selectedItem.displayName}
                </h3>
              </div>

              {/* シンプルなプレビューカード */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  {/* シンプルなプレビュー画像 */}
                  <div className="bg-white p-4 rounded-xl shadow-md">
                    <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                      <img
                        src={image.url}
                        alt="車の画像"
                        className="w-32 h-24 object-contain rounded-md"
                      />
                      <div className="absolute bottom-2 right-2 bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs px-2 py-1 rounded-full font-bold">
                        {selectedItem.displayName}
                      </div>
                    </div>
                  </div>

                  {/* 商品詳細情報 */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-gray-800 flex items-center">
                      <ShoppingBagIcon className="w-5 h-5 text-purple-500 mr-2" />
                      商品詳細
                    </h4>
                    <div className="space-y-3">
                      {/* アイテムタイプ */}
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm font-medium">アイテム</span>
                          <span className="font-bold text-gray-800">
                            {selectedItem.displayName}
                          </span>
                        </div>
                      </div>
                      
                      {/* プリント位置 */}
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm font-medium">プリント位置</span>
                          <span className="font-medium text-gray-800">
                            {selectedItem.availablePrintPlaces.length > 0 
                              ? selectedItem.availablePrintPlaces.join(', ')
                              : 'フロント中央'
                            }
                          </span>
                        </div>
                      </div>
                      
                      {/* 印刷品質 */}
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm font-medium">印刷品質</span>
                          <span className="font-medium text-gray-800">
                            高品質プリント
                          </span>
                        </div>
                      </div>
                      
                      {/* 価格 */}
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm font-medium">販売価格</span>
                          <span className="font-bold text-purple-600 text-xl">
                            ¥{selectedItem.finalPrice.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-right mt-1">
                          <span className="text-gray-500 text-xs">
                            ※サイズ・カラーにより異なります
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* シンプルな確認メッセージ */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <SparklesIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-800 mb-1">準備完了！</p>
                    <p className="text-blue-700 text-sm leading-relaxed">
                      グッズを作成してSUZURIで購入できるようになります。
                    </p>
                  </div>
                </div>
              </div>

              {/* スマホサイズの時のみ表示される作成ボタン */}
              <div className="block sm:hidden">
                <button
                  onClick={handleCreate}
                  disabled={!selectedItem || isCreating}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
                >
                  {isCreating ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      <span>作成中...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" />
                      <span>グッズを作成</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          {step === 'result' && (
            <div className="text-center space-y-8">
              {isCreating ? (
                <div className="py-12">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    {/* 回転するアイコン */}
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <ArrowPathIcon className="w-12 h-12 text-purple-600 animate-spin" />
                    </div>
                    {/* 周りを回るキラキラ */}
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                    <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-pink-400 rounded-full animate-ping animation-delay-300"></div>
                    <div className="absolute top-1/2 -left-4 w-2 h-2 bg-blue-400 rounded-full animate-ping animation-delay-600"></div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">
                    ✨ グッズを作成中...
                  </h3>
                  <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto mb-8">
                    素敵な{selectedItem?.displayName}を作成しています。
                  </p>
                  
                  {/* プログレスバー */}
                  <div className="max-w-xs mx-auto">
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 rounded-full animate-pulse relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      作成中...
                    </p>
                  </div>
                  
                  {/* 小さなプレビュー画像 */}
                  <div className="mt-8 flex justify-center">
                    <div className="relative">
                      <img
                        src={image.url}
                        alt="作成中の画像"
                        className="w-20 h-16 object-contain rounded-lg shadow-lg border-2 border-white transform animate-float"
                      />
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                        <SparklesIcon className="w-4 h-4 text-white animate-pulse" />
                      </div>
                    </div>
                    <div className="mx-6 flex items-center">
                      <ArrowPathIcon className="w-6 h-6 text-purple-500 animate-spin" />
                    </div>
                    <div className="w-20 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center shadow-lg border-2 border-white">
                      <span className="text-2xl animate-bounce">{selectedItem?.icon}</span>
                    </div>
                  </div>
                </div>
              ) : result ? (
                <div>
                  {result.success ? (
                    <div className="py-8 space-y-8">
                      {/* 成功アニメーション */}
                      <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
                          <CheckIcon className="w-12 h-12 text-green-600" />
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-3xl font-bold text-gray-800 mb-4">
                          🎉 グッズ作成完了！
                        </h3>
                        <p className="text-gray-600 text-lg mb-2">
                          素敵な{selectedItem?.displayName}が正常に作成されました
                        </p>
                        <p className="text-purple-600 font-semibold">
                          おめでとうございます！
                        </p>
                      </div>

                      {/* 作成されたグッズの画像 */}
                      {(result.sampleImageUrl || result.sample_image_url) && (
                        <div className="flex justify-center">
                          <div className="relative group">
                            <img
                              src={result.sampleImageUrl || result.sample_image_url}
                              alt="作成されたグッズ"
                              className="max-w-[250px] h-auto rounded-2xl shadow-2xl border-4 border-white transform hover:scale-105 transition-all duration-500 group-hover:shadow-3xl"
                            />
                            <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-400 to-emerald-400 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg animate-pulse">
                              完成品
                            </div>
                            {/* 魔法のエフェクト */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                            <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-pink-400 rounded-full animate-ping opacity-75 animation-delay-300"></div>
                          </div>
                        </div>
                      )}

                      {/* アクションボタン */}
                      <div className="space-y-4 max-w-md mx-auto">
                        {(result.productUrl || result.product_url) ? (
                          <a
                            href={result.productUrl || result.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-full px-8 py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white font-bold rounded-2xl hover:from-purple-700 hover:to-pink-600 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                            onClick={(e) => {
                              const url = result.productUrl || result.product_url;
                              if (!url) {
                                e.preventDefault();
                                alert('商品URLが見つかりません。');
                                return;
                              }
                              
                              // URLの検証
                              try {
                                new URL(url);
                              } catch (error) {
                                e.preventDefault();
                                console.error('無効なURL:', url);
                                alert('無効な商品URLです: ' + url);
                                return;
                              }
                            }}
                          >
                            <ShoppingBagIcon className="w-6 h-6 mr-3" />
                            SUZURIで購入する
                          </a>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-red-600 mb-4">商品URLが取得できませんでした</p>
                            <button
                              onClick={() => {
                                alert('SUZURI応答の詳細をコンソールで確認してください');
                              }}
                              className="text-sm text-gray-500 underline"
                            >
                              詳細をコンソールで確認
                            </button>
                          </div>
                        )}
                        
                        <button
                          onClick={handleBack}
                          className="w-full px-8 py-4 bg-gray-100 text-gray-700 font-semibold rounded-2xl hover:bg-gray-200 transition-all border-2 border-gray-200 hover:border-gray-300"
                        >
                          他のグッズも作成する
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 space-y-6">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <ExclamationTriangleIcon className="w-10 h-10 text-red-600" />
                      </div>
                      
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-4">
                          エラーが発生しました
                        </h3>
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-lg mx-auto">
                          <p className="text-red-700 leading-relaxed">
                            {result.error}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleBack}
                        className="px-8 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        戻る
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* シンプルなフッター */}
        {step !== 'result' && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            {step === 'select' ? (
              <>
                <div className="flex items-center space-x-1 text-gray-500">
                  <span className="text-sm">AISHA × SUZURI</span>
                </div>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium rounded-lg hover:bg-gray-100"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleBack}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium rounded-lg hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span>戻る</span>
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!selectedItem || isCreating}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                >
                  {isCreating ? (
                    <div className="flex items-center space-x-2">
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>作成中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <SparklesIcon className="w-4 h-4" />
                      <span>グッズを作成</span>
                    </div>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};