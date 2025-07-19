
import React, { useState } from 'react';
import { GoodsCreationRecord, GeneratedImage, AspectRatio, User } from '@/types';
import { XMarkIcon, ShoppingBagIcon, CalendarDaysIcon } from '@/components/icons/HeroIcons';
import { SuzuriMerchandiseModal } from './SuzuriMerchandiseModal';

// ITEM_OPTIONSをSuzuriMerchandiseModalから再利用
const ITEM_OPTIONS = [
  {
    id: 'dry-t-shirt',
    name: 'dry-t-shirt',
    displayName: 'ドライTシャツ',
    icon: '👕',
    basePrice: '',
    description: '',
    gradient: 'from-blue-400 to-blue-600',
    suzuriItemId: 112,
  },
  {
    id: 'smartphone-case',
    name: 'smartphone-case',
    displayName: 'iPhoneケース',
    icon: '📱',
    basePrice: '',
    description: '',
    gradient: 'from-purple-400 to-purple-600',
    suzuriItemId: 4,
  },
  {
    id: 'android-smartphone-case',
    name: 'android-smartphone-case',
    displayName: 'Androidケース',
    icon: '📱',
    basePrice: '',
    description: '',
    gradient: 'from-purple-400 to-purple-600',
    suzuriItemId: 294,
  },
  {
    id: 'big-shoulder-bag',
    name: 'big-shoulder-bag',
    displayName: 'ショルダーバッグ',
    icon: '👜',
    basePrice: '',
    description: '',
    gradient: 'from-green-400 to-green-600',
    suzuriItemId: 62,
  },
  {
    id: 'thermo-tumbler',
    name: 'thermo-tumbler',
    displayName: 'タンブラー',
    icon: '🥤',
    basePrice: '',
    description: '',
    gradient: 'from-orange-400 to-orange-600',
    suzuriItemId: 109,
  },
  {
    id: 'sticker',
    name: 'sticker',
    displayName: 'ステッカー',
    icon: '🏷️',
    basePrice: '',
    description: '',
    gradient: 'from-yellow-400 to-yellow-600',
    suzuriItemId: 11,
  },
  {
    id: 'clear-file-folder',
    name: 'clear-file-folder',
    displayName: 'クリアファイル',
    icon: '📁',
    basePrice: '',
    description: '',
    gradient: 'from-indigo-400 to-indigo-600',
    suzuriItemId: 101,
  },
];

interface GoodsCreationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GoodsCreationRecord[];
  currentUser?: User | null; // ユーザー情報を追加
  onGoodsCreated?: () => void; // グッズ再作成成功時のコールバック
}

export const GoodsCreationHistoryModal: React.FC<GoodsCreationHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  currentUser,
  onGoodsCreated 
}) => {
  const [isSuzuriModalOpen, setIsSuzuriModalOpen] = useState(false);
  const [selectedRecordForGoods, setSelectedRecordForGoods] = useState<GoodsCreationRecord | null>(null);

  // アイテムタイプ別の価格を取得する関数
  const getItemPrice = (itemType: string): string => {
    const priceMapping: Record<string, string> = {
      // データベースの実際の値に基づくマッピング
      'thermo-tumbler': '¥3,500〜',
      'android-smartphone-case': '¥3,500〜',
      'dry-t-shirt': '¥3,500〜',
      'sticker': '¥800〜',
      'clear-file-folder': '¥1,200〜',
      'heavyweight-t-shirt': '¥3,500〜',
      'heavyweight-hoodie': '¥4,800〜',
      'mug': '¥2,500〜',
      'heavyweight-sweat': '¥4,200〜',
      // 後方互換性のための既存マッピング
      'mug-cup': '¥2,500〜',
      'tote-bag': '¥2,800〜',
      'iphone-case': '¥3,500〜',
      'smartphone-case': '¥3,500〜',
      'phone-case': '¥3,500〜',
      'case': '¥3,500〜',
    };
    
    return priceMapping[itemType] || '¥3,500〜';
  };

  // アイテムタイプの表示名を取得する関数
  const getItemDisplayName = (itemType: string): string => {
    // ITEM_OPTIONSからdisplayNameを取得
    const itemOption = ITEM_OPTIONS.find(item => item.id === itemType);
    if (itemOption) {
      return itemOption.displayName;
    }
    
    // 後方互換性のための既存マッピング（ITEM_OPTIONSにないもののみ）
    const displayNames: Record<string, string> = {
      'heavyweight-t-shirt': 'Tシャツ',
      'heavyweight-hoodie': 'パーカー',
      'heavyweight-sweat': 'スウェット',
      'mug-cup': 'マグカップ',
      'mug': 'マグカップ',
      'tote-bag': 'トートバッグ',
      'iphone-case': 'iPhoneケース',
      'android-case': 'Androidケース',
      'smartphone-case': 'スマホケース',
      'phone-case': 'スマホケース',
      'case': 'スマホケース',
    };
    
    return displayNames[itemType] || 'グッズ';
  };

  if (!isOpen) return null;

  // GoodsCreationRecordからExistingProductDataを構築する関数
  const convertRecordToExistingProductData = (record: GoodsCreationRecord) => {
    if (!record.selectedVariations) {
      return null;
    }
    
    const { itemType, productId, productUrl, originalImageUrl } = record.selectedVariations;
    
    if (!itemType || !productId || !productUrl) {
      return null;
    }
    
    return {
      selectedItemId: itemType,
      merchandiseResult: {
        success: true,
        productUrl: productUrl,
        product_url: productUrl,
        productId: parseInt(productId),
        product_id: parseInt(productId),
        productTitle: record.goodsName,
        product_title: record.goodsName,
        sampleImageUrl: record.imageUrl, // サムネイル画像URL
        sample_image_url: record.imageUrl,
        itemName: itemType,
        item_name: itemType,
      }
    };
  };

  // GoodsCreationRecordからGeneratedImageを構築する関数
  const convertRecordToGeneratedImage = (record: GoodsCreationRecord): GeneratedImage => {
    // SUZURI APIには元の生成画像URLを渡す必要があるため、selectedVariationsから取得
    const originalImageUrl = record.selectedVariations?.originalImageUrl || record.imageUrl || '';
    
    return {
      id: record.imageId,
      url: originalImageUrl, // 元の生成画像URLを使用
      displayPrompt: record.prompt || record.goodsName,
      menuName: record.goodsName,
      usedFormData: {
        category: null,
        menu: null,
        image: null,
        additionalPromptForMyCar: '',
        additionalPromptForOthers: '',
        aspectRatio: AspectRatio.Square_1_1,
        promptVariables: [],
        inputType: 'upload',
      },
      fullOptions: {
        finalPromptForService: record.prompt || record.goodsName,
        generationEngineForService: 'imagen3',
        creditCostForService: record.creditCost,
        aspectRatio: AspectRatio.Square_1_1,
      },
      timestamp: record.timestamp,
      isPublic: false,
      isSavedToLibrary: true,
    };
  };

  const handleGoodsClick = (record: GoodsCreationRecord) => {
    if (!record.imageUrl) {
      console.error('画像URLが見つかりません');
      return;
    }
    setSelectedRecordForGoods(record);
    setIsSuzuriModalOpen(true);
  };

  const handleSuzuriModalClose = () => {
    setIsSuzuriModalOpen(false);
    setSelectedRecordForGoods(null);
  };

  const handleGoodsCreatedSuccess = () => {
    if (onGoodsCreated) {
      onGoodsCreated();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 md:mb-6 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-semibold text-indigo-400">グッズ作成履歴</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700">
            <XMarkIcon className="w-6 md:w-7 h-6 md:h-7" />
          </button>
        </div>
        {history.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-gray-500 py-8">
            <ShoppingBagIcon className="w-16 h-16 md:w-20 md:h-20 mb-4" />
            <p className="text-lg md:text-xl">グッズ作成履歴はまだありません。</p>
            <p className="text-sm md:text-base">画像からグッズを作成するとここに追加されます。</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 pb-4">
              {history.map((record) => (
                <button
                  key={record.id}
                  onClick={() => handleGoodsClick(record)}
                  disabled={!record.imageUrl}
                  className="bg-gray-700 rounded-lg shadow-md overflow-hidden flex flex-col group transition-all hover:shadow-indigo-500/30 hover:ring-1 hover:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 min-w-0"
                  title={record.imageUrl ? "クリックして再度グッズを作成" : "画像が利用できません"}
                >
                  <div className="aspect-square w-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    {record.imageUrl ? (
                      <img 
                        src={record.imageUrl} 
                        alt={record.goodsName} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <ShoppingBagIcon className="w-1/2 h-1/2 text-gray-500" />
                    )}
                  </div>
                  <div className="p-2 md:p-3 text-xs flex flex-col flex-grow justify-between min-w-0">
                    <div className="min-w-0">
                      {/* グッズ名と価格の表示 */}
                      <div className="space-y-1">
                        {/* グッズタイプ */}
                        <div className="bg-gray-600 rounded px-2 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-[10px]">グッズ</span>
                            <span className="font-medium text-indigo-300 text-[10px] truncate ml-1">
                              {record.selectedVariations?.itemType ? getItemDisplayName(record.selectedVariations.itemType) : 'グッズ'}
                            </span>
                          </div>
                        </div>
                        
                        {/* 価格 */}
                        <div className="bg-gray-600 rounded px-2 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-[10px]">価格</span>
                            <span className="font-bold text-purple-400 text-[10px]">
                              {record.selectedVariations?.itemType ? getItemPrice(record.selectedVariations.itemType) : '¥3,500〜'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-auto space-y-0.5">
                      <div className="flex items-center text-gray-500 text-[10px]">
                        <CalendarDaysIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span>{new Date(record.timestamp).toLocaleDateString('ja-JP', { year: '2-digit', month: '2-digit', day: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* SUZURI Merchandise Modal */}
      {selectedRecordForGoods && (
        <SuzuriMerchandiseModal
          isOpen={isSuzuriModalOpen}
          onClose={handleSuzuriModalClose}
          image={convertRecordToGeneratedImage(selectedRecordForGoods)}
          currentUser={currentUser}
          onGoodsCreated={handleGoodsCreatedSuccess}
          initialStep="result"
          existingProductData={convertRecordToExistingProductData(selectedRecordForGoods) || undefined}
        />
      )}
    </div>
  );
};
