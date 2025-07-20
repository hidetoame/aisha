import React, { useState, useRef, useEffect } from 'react'; // Added useRef and useEffect
import SalesManagementView from './SalesManagementView';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';
import {
  AdminGenerationMenuItem,
  AdminGoodsItem,
  SupportedGenerationEngine,
  AdminChargeOptionItem,
  AdminGenerationMenuCategoryItem,
  AdminSection,
  GoodsVariation,
} from '../types';
import {
  CogIcon,
  ViewGridIcon,
  CubeIcon,
  UsersIcon,
  PlusCircleIcon,
  PencilAltIcon,
  TrashIcon,
  LinkIcon,
  KeyIcon,
  CreditCardIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  FolderOpenIcon,
} from '../components/icons/HeroIcons';
import { GOODS_OPTIONS as DEFAULT_GOODS_OPTIONS } from '../constants';
import { ImageUpload, ImageUploadRef } from '@/components/ImageUpload'; // Added ImageUpload import
import {
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryOrder,
} from '../services/api/categories';
import { createMenu, updateMenu, deleteMenu } from '../services/api/menus';
import {
  useChargeOptions,
  useChargeOptionsActions,
} from '@/contexts/ChargeOptionsContext';
import {
  createChargeOption,
  deleteChargeOption,
  updateChargeOption,
} from '@/services/api/charge-options';
import { useToast } from '@/contexts/ToastContext';
import {
  useCategories,
  useCategoriesActions,
} from '@/contexts/CategoriesContext';
import { useMenus, useMenusActions } from '@/contexts/MenusContext';
import { getUserCredits, addCreditsToUser, UserCreditInfo } from '@/services/api/admin-credits';
import { 
  getGoodsManagementList, 
  updateGoodsManagement, 
  syncSuzuriItems,
  GoodsManagementItem 
} from '@/services/api/goods-management';
import AdminGoodsManagementForm from '@/components/AdminGoodsManagementForm';

const initialGoods: AdminGoodsItem[] = DEFAULT_GOODS_OPTIONS.map((opt) => ({
  id: opt.id,
  suzuriApiId: opt.apiId,
  goodsName: opt.name,
  creditCost: opt.creditCost,
  variations: opt.variations ? JSON.parse(JSON.stringify(opt.variations)) : [],
  imageUrl: opt.imageUrl || undefined, // Ensure imageUrl is part of initialGoods
}));

const AdminView: React.FC = () => {
  const { showToast } = useToast();

  const categories = useCategories();
  const { refreshCategories } = useCategoriesActions();
  const [editingAdminGenMenuCategory, setEditingAdminGenMenuCategory] =
    useState<AdminGenerationMenuCategoryItem | null>(null);

  const menus = useMenus();
  const { refreshMenus } = useMenusActions();
  const [editingGenMenu, setEditingGenMenu] =
    useState<AdminGenerationMenuItem | null>(null);

  const chargeOptions = useChargeOptions();
  const { refreshChargeOptions } = useChargeOptionsActions();
  const [editingChargeOption, setEditingChargeOption] =
    useState<AdminChargeOptionItem | null>(null);

  const [activeSection, setActiveSection] =
    useState<AdminSection>('genMenuCategories'); // Default to first item in new order

  const [goodsItems, setGoodsItems] = useState<GoodsManagementItem[]>([]);
  const [editingGoodsItem, setEditingGoodsItem] =
    useState<GoodsManagementItem | null>(null);
  const [isLoadingGoods, setIsLoadingGoods] = useState(false);
  const [isSyncingGoods, setIsSyncingGoods] = useState(false);
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  const [showSubMaterialsOnly, setShowSubMaterialsOnly] = useState(false);

  // クレジット管理用のstate
  const [searchUsername, setSearchUsername] = useState('');
  const [foundUsers, setFoundUsers] = useState<UserCreditInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserCreditInfo | null>(null);
  const [creditAmount, setCreditAmount] = useState(100);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingCredits, setIsAddingCredits] = useState(false);

  // ドラッグ&ドロップ用の状態
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // コンポーネントマウント時にグッズ一覧を自動読み込み
  useEffect(() => {
    if (activeSection === 'goods') {
      loadGoodsItems();
    }
  }, [activeSection]);

  const renderAdminNavItem = (
    sectionId: AdminSection,
    label: string,
    icon: React.ReactNode,
  ) => (
    <button
      key={sectionId}
      onClick={() => {
        setActiveSection(sectionId);
      }}
      className={`flex items-center space-x-3 p-3 rounded-md w-full text-left transition-colors duration-150
                  ${activeSection === sectionId ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-indigo-400'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  // クレジット管理の関数
  const handleSearchUser = async () => {
    if (!searchUsername.trim()) {
      showToast('ユーザー名を入力してください', 'error');
      return;
    }

    setIsSearching(true);
    try {
      const userInfo = await getUserCredits(searchUsername.trim());
      console.log('Search result:', userInfo);
      
      if (Array.isArray(userInfo)) {
        setFoundUsers(userInfo);
        setSelectedUser(null);
        showToast(`${userInfo.length}人のユーザーが見つかりました`, 'success');
      } else {
        setFoundUsers([userInfo]);
        setSelectedUser(userInfo);
        showToast('ユーザーが見つかりました', 'success');
      }
    } catch (error) {
      console.error('ユーザー検索エラー:', error);
      setFoundUsers([]);
      setSelectedUser(null);
      showToast(
        error instanceof Error ? error.message : 'ユーザーの検索に失敗しました',
        'error'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser) {
      showToast('先にユーザーを選択してください', 'error');
      return;
    }

    if (creditAmount <= 0) {
      showToast('クレジット数は1以上を入力してください', 'error');
      return;
    }

    setIsAddingCredits(true);
    try {
      const result = await addCreditsToUser({
        userIdentifier: selectedUser.firebase_uid,
        amount: creditAmount,
        description: `管理者による手動追加: ${creditAmount}クレジット`,
      });

      if (result.success) {
        showToast(`${selectedUser.nickname}に${creditAmount}クレジットを追加しました！`, 'success');

        const updatedUserInfo = await getUserCredits(selectedUser.firebase_uid);
        if (Array.isArray(updatedUserInfo)) {
          const updated = updatedUserInfo.find(u => u.firebase_uid === selectedUser.firebase_uid);
          if (updated) {
            setSelectedUser(updated);
            setFoundUsers(foundUsers.map(u => u.firebase_uid === selectedUser.firebase_uid ? updated : u));
          }
        } else {
          setSelectedUser(updatedUserInfo);
          setFoundUsers([updatedUserInfo]);
        }
      } else {
        showToast(result.message || 'クレジットの追加に失敗しました', 'error');
      }
    } catch (error) {
      console.error('クレジット追加エラー:', error);
      showToast(
        `${selectedUser.nickname}へのクレジット追加に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        'error'
      );
    } finally {
      setIsAddingCredits(false);
    }
  };

  // グッズ管理の関数
  const loadGoodsItems = async () => {
    setIsLoadingGoods(true);
    try {
      const params = new URLSearchParams();
      if (showPublicOnly) {
        params.append('public_only', 'true');
      }
      if (showSubMaterialsOnly) {
        params.append('needs_sub_materials', 'true');
      }
      
      console.log('=== フィルター状態 ===');
      console.log('showPublicOnly:', showPublicOnly);
      console.log('showSubMaterialsOnly:', showSubMaterialsOnly);
      console.log('APIパラメータ:', params.toString());
      console.log('========================');
      
      const items = await getGoodsManagementList(params.toString());
      
      console.log('=== 取得結果 ===');
      console.log('取得した商品数:', items.length);
      console.log('sub_materials必要の商品数:', items.filter(item => item.needs_sub_materials).length);
      console.log('公開商品数:', items.filter(item => item.is_public).length);
      console.log('========================');
      
      setGoodsItems(items);
    } catch (error) {
      console.error('グッズ管理一覧取得エラー:', error);
      showToast(
        error instanceof Error ? error.message : 'グッズ管理一覧の取得に失敗しました',
        'error'
      );
    } finally {
      setIsLoadingGoods(false);
    }
  };

  const handleSyncSuzuriItems = async () => {
    setIsSyncingGoods(true);
    try {
      const result = await syncSuzuriItems();
      showToast(result.message, 'success');
      // 同期後に一覧を再取得
      await loadGoodsItems();
    } catch (error) {
      console.error('SUZURIアイテム同期エラー:', error);
      showToast(
        error instanceof Error ? error.message : 'SUZURIアイテムの同期に失敗しました',
        'error'
      );
    } finally {
      setIsSyncingGoods(false);
    }
  };

  const handleUpdateGoodsItem = async (goodsId: number, data: any) => {
    try {
      const updatedItem = await updateGoodsManagement(goodsId, data);
      setGoodsItems(prev => 
        prev.map(item => item.id === goodsId ? updatedItem : item)
      );
      showToast('グッズ情報を更新しました', 'success');
      setEditingGoodsItem(null);
    } catch (error) {
      console.error('グッズ更新エラー:', error);
      showToast(
        error instanceof Error ? error.message : 'グッズ情報の更新に失敗しました',
        'error'
      );
    }
  };

  // ドラッグ&ドロップのハンドラー
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setIsDragging(false);

    if (!over || active.id === over.id) {
      return;
    }

    if (!categories) return;

    const oldIndex = categories.findIndex(cat => cat.id.toString() === active.id);
    const newIndex = categories.findIndex(cat => cat.id.toString() === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newCategories = arrayMove(categories, oldIndex, newIndex);
      
      // ローカル状態を先に更新（ユーザー体験をスムーズに）
      refreshCategories();
      
      // サーバーに順番更新を送信
      const orderUpdates = newCategories.map((cat, index) => ({
        id: cat.id,
        orderIndex: index
      }));
      
      const success = await updateCategoryOrder(orderUpdates, () => {
        showToast('カテゴリ順番の更新に失敗しました', 'error');
      });
      
      if (success) {
        showToast('カテゴリ順番を更新しました', 'success');
        refreshCategories();
      }
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'sales':
        return <SalesManagementView />;
      case 'genMenuCategories':
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-indigo-300">
                生成メニューカテゴリ管理
              </h3>
              <button
                onClick={() =>
                  setEditingAdminGenMenuCategory({
                    id: 0,
                    name: '',
                    description: '',
                  })
                }
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2" /> 新規カテゴリ追加
              </button>
            </div>
            {editingAdminGenMenuCategory && (
              <AdminGenMenuCategoryForm
                item={editingAdminGenMenuCategory}
                onSave={async (newItem) => {
                  const onError = () =>
                    showToast('error', 'カテゴリ保存に失敗しました');
                  let savedItem =
                    newItem.id === 0
                      ? await createCategory(newItem, onError)
                      : await updateCategory(newItem, onError);
                  if (savedItem) {
                    showToast('success', 'カテゴリを保存しました');
                    refreshCategories();
                    setEditingAdminGenMenuCategory(null);
                  }
                }}
                onCancel={() => setEditingAdminGenMenuCategory(null)}
              />
            )}
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">
                ドラッグ&ドロップでカテゴリ順番を変更できます
              </p>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categories?.map(cat => cat.id.toString()) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-3">
                    {categories?.map((cat) => (
                      <SortableCategoryItem
                        key={cat.id}
                        category={cat}
                        onEdit={() => setEditingAdminGenMenuCategory(cat)}
                        onDelete={async () => {
                          if (window.confirm(`${cat.name}を削除しますか？`)) {
                            const success = await deleteCategory(cat.id, () => {
                              showToast('error', 'カテゴリ削除に失敗しました');
                            });
                            if (success) {
                              showToast('success', 'カテゴリを削除しました');
                              refreshCategories();
                            }
                          }
                        }}
                        isDragging={isDragging}
                      />
                    ))}
                  </ul>
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-gray-600 p-4 rounded-md shadow-lg opacity-80">
                      <p className="font-semibold text-indigo-400">
                        {categories?.find(cat => cat.id.toString() === activeId)?.name}
                      </p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        );
      case 'engines':
        return (
          <div>
            <h3 className="text-xl font-semibold text-indigo-300 mb-4">
              利用エンジン設定
            </h3>
            <p className="text-gray-400 mb-6">
              アプリケーションで使用するAIエンジンのAPIキーは、サーバー側の環境変数で設定する必要があります。以下は、各エンジンに必要な代表的な環境変数名です。
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-700 p-4 rounded-md">
                <h4 className="text-lg font-medium text-indigo-400 mb-3">
                  画像生成モデル
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-gray-200">
                      Google Imagen (Gemini API経由)
                    </p>
                    <p className="text-sm text-gray-300">
                      環境変数:{' '}
                      <code className="bg-gray-600 px-1.5 py-0.5 rounded text-indigo-300">
                        API_KEY
                      </code>
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-200">
                      OpenAI DALL·E 3
                    </p>
                    <p className="text-sm text-gray-300">
                      環境変数:{' '}
                      <code className="bg-gray-600 px-1.5 py-0.5 rounded text-indigo-300">
                        OPENAI_API_KEY
                      </code>
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-200">Flux Kontext</p>
                    <p className="text-sm text-gray-300">
                      環境変数:{' '}
                      <code className="bg-gray-600 px-1.5 py-0.5 rounded text-indigo-300">
                        FLUX_API_KEY
                      </code>
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-200">Midjourney</p>
                    <p className="text-sm text-gray-400">
                      (通常、公式APIは提供されておらず、Discord
                      Bot経由での利用となります。)
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-md">
                <h4 className="text-lg font-medium text-indigo-400 mb-3">
                  言語モデル
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-gray-200">
                      Google Gemini (Text)
                    </p>
                    <p className="text-sm text-gray-300">
                      環境変数:{' '}
                      <code className="bg-gray-600 px-1.5 py-0.5 rounded text-indigo-300">
                        API_KEY
                      </code>
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-200">
                      OpenAI ChatGPT (GPT-3.5/4)
                    </p>
                    <p className="text-sm text-gray-300">
                      環境変数:{' '}
                      <code className="bg-gray-600 px-1.5 py-0.5 rounded text-indigo-300">
                        OPENAI_API_KEY
                      </code>
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-200">
                      Ideogram (Text-to-Imageも)
                    </p>
                    <p className="text-sm text-gray-300">
                      環境変数:{' '}
                      <code className="bg-gray-600 px-1.5 py-0.5 rounded text-indigo-300">
                        IDEOGRAM_API_KEY
                      </code>{' '}
                      (仮)
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-8">
              注意:
              APIキーはUI上では設定・表示できません。サーバー環境で安全に管理してください。上記は代表的な例であり、使用するSDKやライブラリによって異なる場合があります。
            </p>
          </div>
        );
      case 'genMenus':
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-indigo-300">
                生成メニュー管理
              </h3>
              <button
                onClick={() =>
                  setEditingGenMenu({
                    id: 0,
                    name: '',
                    engine: 'imagen3',
                    prompt: '',
                    credit: 10,
                    promptVariables: [],
                    sampleInputImageUrl: '',
                    sampleResultImageUrl: '',
                  } as AdminGenerationMenuItem)
                }
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2" /> 新規メニュー追加
              </button>
            </div>
            {editingGenMenu && (
              <AdminGenMenuForm
                item={editingGenMenu}
                categories={categories ?? []}
                onSave={async (newItem) => {
                  const requiredPromptVariableLength =
                    newItem.promptVariables?.length ?? 0;
                  const matches = newItem.prompt.match(/{{.*?}}/g);
                  const inputPromptVariableLength = matches
                    ? matches.length
                    : 0;
                  if (
                    inputPromptVariableLength !== requiredPromptVariableLength
                  ) {
                    showToast(
                      'error',
                      'ユーザー追加入力項目数がプロンプトと一致しません。',
                    );
                    return;
                  }
                  const onError = () =>
                    showToast('error', 'メニュー保存に失敗しました');
                  let savedItem =
                    newItem.id === 0
                      ? await createMenu(newItem, onError)
                      : await updateMenu(newItem, onError);
                  if (savedItem) {
                    showToast('success', 'メニューを保存しました');
                    refreshMenus();
                    setEditingGenMenu(null);
                  }
                }}
                onCancel={() => setEditingGenMenu(null)}
              />
            )}
            <ul className="space-y-3 mt-4">
              {menus?.map((menu) => {
                const category = categories?.find(
                  (c) => c.id === menu.categoryId,
                );
                return (
                  <li
                    key={menu.id}
                    className="bg-gray-700 p-4 rounded-md shadow flex justify-between items-start"
                  >
                    <div>
                      <p className="font-semibold text-indigo-400">
                        {menu.name}{' '}
                        <span className="text-xs text-gray-400">
                          ({menu.engine})
                        </span>
                      </p>
                      {category && (
                        <p className="text-xs text-cyan-400 bg-cyan-900/50 px-1.5 py-0.5 rounded-full inline-block my-1">
                          カテゴリ: {category.name}
                        </p>
                      )}
                      <p
                        className="text-sm text-gray-300 mt-1"
                        title={menu.description}
                      >
                        簡易説明: {menu.description || '未設定'}
                      </p>
                      <p
                        className="text-sm text-gray-300 mt-1 truncate max-w-md"
                        title={menu.engine}
                      >
                        プロンプト: {menu.engine}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        コスト: {menu.credit} クレジット
                      </p>
                      {(menu.sampleInputImageUrl ||
                        menu.sampleResultImageUrl) && (
                        <div className="mt-2 flex space-x-2">
                          {menu.sampleInputImageUrl && (
                            <img
                              src={menu.sampleInputImageUrl}
                              alt="Sample Source"
                              className="w-16 h-10 object-cover rounded border border-gray-600"
                            />
                          )}
                          {menu.sampleResultImageUrl && (
                            <img
                              src={menu.sampleResultImageUrl}
                              alt="Sample Generated"
                              className="w-16 h-10 object-cover rounded border border-gray-600"
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-x-2 flex-shrink-0">
                      <button
                        onClick={() => setEditingGenMenu(menu)}
                        className="p-2 text-gray-400 hover:text-indigo-300"
                        aria-label={`Edit ${menu.name}`}
                      >
                        <PencilAltIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`${menu.name}を削除しますか？`)) {
                            const success = await deleteMenu(menu.id, () => {
                              showToast('error', 'メニュー削除に失敗しました');
                            });
                            if (success) {
                              showToast('success', 'メニューを削除しました');
                              refreshMenus();
                            }
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-400"
                        aria-label={`Delete ${menu.name}`}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      case 'goods':
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-indigo-300">
                グッズ管理
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleSyncSuzuriItems}
                  disabled={isSyncingGoods}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center"
                >
                  {isSyncingGoods ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      同期中...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-5 h-5 mr-2" />
                      SUZURI同期
                    </>
                  )}
                </button>

              </div>
            </div>
            
            {editingGoodsItem && (
              <AdminGoodsManagementForm
                item={editingGoodsItem}
                onSave={(data) => handleUpdateGoodsItem(editingGoodsItem.id, data)}
                onCancel={() => setEditingGoodsItem(null)}
              />
            )}
            
            <div className="mt-4">
              <div className="flex items-center space-x-4 mb-4">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={showPublicOnly}
                    onChange={(e) => {
                      console.log('公開チェックボックス変更:', e.target.checked);
                      setShowPublicOnly(e.target.checked);
                      // 状態更新後に少し待ってからAPI呼び出し
                      setTimeout(() => {
                        loadGoodsItems();
                      }, 0);
                    }}
                    className="rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>公開のみ表示</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={showSubMaterialsOnly}
                    onChange={(e) => {
                      console.log('sub_materialsチェックボックス変更:', e.target.checked);
                      setShowSubMaterialsOnly(e.target.checked);
                      // 状態更新後に少し待ってからAPI呼び出し
                      setTimeout(() => {
                        loadGoodsItems();
                      }, 0);
                    }}
                    className="rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span>sub_materials必要のみ表示</span>
                </label>
              </div>
              {isLoadingGoods ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
                  <span className="ml-2 text-gray-400">グッズ一覧を読み込み中...</span>
                </div>
              ) : goodsItems.length === 0 ? (
                <div className="text-center py-8">
                  <CubeIcon className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">グッズが登録されていません</p>
                  <p className="text-sm text-gray-500 mt-2">
                    「SUZURI同期」ボタンをクリックしてアイテムを同期してください
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={async (event) => {
                    const { active, over } = event;
                    setActiveId(null);
                    setIsDragging(false);
                    if (!over || active.id === over.id) return;
                    // 公開のみ表示の場合も含め、表示中リスト順でdisplay_orderを再割り当て
                    const filtered = goodsItems.filter(item => !showPublicOnly || item.is_public);
                    const oldIndex = filtered.findIndex(item => item.id.toString() === active.id);
                    const newIndex = filtered.findIndex(item => item.id.toString() === over.id);
                    if (oldIndex !== -1 && newIndex !== -1) {
                      const newList = arrayMove(filtered, oldIndex, newIndex);
                      // display_orderを再割り当て
                      await Promise.all(newList.map((item, idx) => updateGoodsManagement(item.id, { display_order: idx })));
                      // 再取得
                      await loadGoodsItems();
                      showToast('表示順序を更新しました', 'success');
                    }
                  }}
                >
                  <SortableContext
                    items={goodsItems.filter(item => !showPublicOnly || item.is_public).map(item => item.id.toString())}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-3">
                      {goodsItems.filter(item => !showPublicOnly || item.is_public).map((item) => (
                        <SortableGoodsItem
                          key={item.id}
                          item={item}
                          onEdit={() => {
                            console.log('Setting editing goods item:', item);
                            setEditingGoodsItem(item);
                          }}
                          isDragging={activeId === item.id.toString()}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                  <DragOverlay>
                    {activeId ? (
                      <div className="bg-gray-700 p-4 rounded-md shadow flex justify-between items-start opacity-80">
                        <div className="flex items-start space-x-4">
                          {goodsItems.find(item => item.id.toString() === activeId)?.icon_url ? (
                            <img
                              src={goodsItems.find(item => item.id.toString() === activeId)?.icon_url}
                              alt={goodsItems.find(item => item.id.toString() === activeId)?.display_name}
                              className="w-20 h-20 object-cover rounded-md border border-gray-600 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-20 h-20 bg-gray-600 rounded-md flex items-center justify-center text-gray-500 flex-shrink-0">
                              <CubeIcon className="w-10 h-10" />
                            </div>
                          )}
                          <div className="flex-grow">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-semibold text-indigo-400">
                                {goodsItems.find(item => item.id.toString() === activeId)?.display_name}
                              </p>
                              <span className={`px-2 py-1 text-xs rounded-full ${goodsItems.find(item => item.id.toString() === activeId)?.is_public ? 'bg-green-600 text-green-100' : 'bg-gray-600 text-gray-300'}`}>
                                {goodsItems.find(item => item.id.toString() === activeId)?.is_public ? '公開' : '非公開'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </div>
          </div>
        );
      case 'chargeManagement':
        return (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-indigo-300">
                チャージオプション管理
              </h3>
              <button
                onClick={() =>
                  setEditingChargeOption({
                    id: 0,
                    name: '',
                    priceYen: 0,
                    creditsAwarded: 0,
                    displayInfo: '',
                    isActive: true,
                    creditsBonus: 0,
                  })
                }
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2" />{' '}
                新規チャージオプション追加
              </button>
            </div>
            {editingChargeOption && (
              <AdminChargeOptionForm
                item={editingChargeOption}
                onSave={async (newItem) => {
                  const onError = () =>
                    showToast('error', 'チャージオプション保存に失敗しました');
                  let savedItem =
                    newItem.id === 0
                      ? await createChargeOption(newItem, onError)
                      : await updateChargeOption(newItem, onError);
                  if (savedItem) {
                    showToast('success', 'チャージオプションを保存しました');
                    refreshChargeOptions();
                    setEditingChargeOption(null);
                  }
                }}
                onCancel={() => setEditingChargeOption(null)}
              />
            )}
            <ul className="space-y-3 mt-4">
              {chargeOptions?.map((option) => (
                <li
                  key={option.id}
                  className={`bg-gray-700 p-4 rounded-md shadow flex justify-between items-center ${!option.isActive ? 'opacity-60' : ''}`}
                >
                  <div>
                    <p className="font-semibold text-indigo-400">
                      {option.name}{' '}
                      {option.isActive ? (
                        <span className="text-xs text-green-400">(有効)</span>
                      ) : (
                        <span className="text-xs text-gray-500">(無効)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-300">
                      価格: {option.priceYen}円
                    </p>
                    <p className="text-sm text-gray-300">
                      付与クレジット: {option.creditsAwarded} (表示:{' '}
                      {option.displayInfo})
                    </p>
                    {option.creditsBonus && option.creditsBonus > 0 ? (
                      <p className="text-xs text-yellow-400">
                        ボーナス: +{option.creditsBonus} クレジット
                      </p>
                    ) : null}
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={() => setEditingChargeOption(option)}
                      className="p-2 text-gray-400 hover:text-indigo-300"
                      aria-label={`Edit ${option.name}`}
                    >
                      <PencilAltIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`${option.name}を削除しますか？`)) {
                          const success = await deleteChargeOption(
                            option.id,
                            () => {
                              showToast(
                                'error',
                                'チャージオプション削除に失敗しました',
                              );
                            },
                          );
                          if (success) {
                            showToast(
                              'success',
                              'チャージオプションを削除しました',
                            );
                            refreshChargeOptions();
                          }
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-400"
                      aria-label={`Delete ${option.name}`}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      case 'suzuriApi':
        return (
          <div>
            <h3 className="text-xl font-semibold text-indigo-300 mb-4">
              SUZURI API 設定
            </h3>
            <p className="text-gray-400 mb-2">
              SUZURIとの連携（グッズ作成など）には、SUZURI
              APIアクセストークンが必要です。
              このアクセストークンは、サーバー側の環境変数で設定してください。
            </p>
            <div className="p-4 bg-gray-700 rounded-md mt-4">
              <h4 className="text-lg font-medium text-indigo-400">
                アクセストークン
              </h4>
              <p className="text-sm text-gray-300 mt-1">
                必要な環境変数名:{' '}
                <code className="bg-gray-600 px-1.5 py-0.5 rounded text-indigo-300">
                  SUZURI_ACCESS_TOKEN
                </code>
              </p>
            </div>
            <p className="text-gray-400 mt-4">
              APIドキュメントはこちらを参照してください:{' '}
              <a
                href="https://suzuri.jp/developer/documentation/v1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                SUZURI API Documentation
              </a>
            </p>
            <p className="text-xs text-gray-500 mt-6">
              注意:
              APIアクセストークンはUI上では設定できません。サーバー環境で安全に管理してください。
            </p>
          </div>
        );
      case 'stripeApi':
        return (
          <div>
            <h3 className="text-xl font-semibold text-indigo-300 mb-4">
              Stripe API 設定
            </h3>
            <p className="text-gray-400 mb-2">
              Stripe決済代行サービスとの連携には、Stripe APIキーが必要です。
              これらのキーは、サーバー側の環境変数で設定してください。
            </p>
            <div className="space-y-3 mt-4">
              <div className="p-4 bg-gray-700 rounded-md">
                <h4 className="text-lg font-medium text-indigo-400">
                  公開可能キー (Publishable Key)
                </h4>
                <p className="text-sm text-gray-300 mt-1">
                  必要な環境変数名:{' '}
                  <code className="bg-gray-600 px-1.5 py-0.5 rounded text-indigo-300">
                    STRIPE_PUBLISHABLE_KEY
                  </code>
                </p>
              </div>
              <div className="p-4 bg-gray-700 rounded-md">
                <h4 className="text-lg font-medium text-indigo-400">
                  シークレットキー (Secret Key)
                </h4>
                <p className="text-sm text-gray-300 mt-1">
                  必要な環境変数名:{' '}
                  <code className="bg-gray-600 px-1.5 py-0.5 rounded text-indigo-300">
                    STRIPE_SECRET_KEY
                  </code>
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-6">
              注意:
              APIキーはUI上では設定できません。サーバー環境で安全に管理してください。
            </p>
          </div>
        );
      case 'users':
        return (
          <div className="text-gray-400">
            <h3 className="text-xl font-semibold text-indigo-300 mb-2">
              ユーザー管理
            </h3>
            <p>
              ユーザーアカウントの一覧表示、ロール変更、アカウント停止などの機能。(現在プレースホルダー)
            </p>
          </div>
        );
      case 'creditManagement':
        return (
          <div>
            <h3 className="text-xl font-semibold text-indigo-300 mb-6">
              クレジット管理
            </h3>
            
            {/* ユーザー検索セクション */}
            <div className="bg-gray-800 p-6 rounded-lg mb-6">
              <h4 className="text-lg font-medium text-white mb-4">ユーザー検索</h4>
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  placeholder="ユーザー名を入力"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchUser()}
                />
                <button
                  onClick={handleSearchUser}
                  disabled={isSearching}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? '検索中...' : '検索'}
                </button>
              </div>
            </div>

            {/* 検索結果表示セクション */}
            {foundUsers.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-lg mb-6">
                <h4 className="text-lg font-medium text-white mb-4">
                  検索結果 ({foundUsers.length}人)
                </h4>
                <div className="space-y-4">
                  {foundUsers.map((user, index) => (
                    <div
                      key={user.firebase_uid}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedUser?.firebase_uid === user.firebase_uid
                          ? 'border-indigo-500 bg-indigo-50 bg-opacity-10'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">ユーザー名:</span>
                          <span className="text-white ml-2 font-medium">{user.nickname}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">ユーザータイプ:</span>
                          <span className="text-blue-400 ml-2">{user.user_type}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">統一クレジット:</span>
                          <span className="text-green-400 ml-2 font-medium">{user.unified_credits}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">レガシークレジット:</span>
                          <span className="text-yellow-400 ml-2 font-medium">{user.legacy_credits}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">電話番号:</span>
                          <span className="text-white ml-2">{user.phone_number || 'なし'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Firebase UID:</span>
                          <span className="text-gray-300 ml-2 text-xs">{user.firebase_uid}</span>
                        </div>
                      </div>
                      {selectedUser?.firebase_uid === user.firebase_uid && (
                        <div className="mt-2 text-xs text-indigo-400">
                          ✓ 選択済み - このユーザーにクレジットを追加できます
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* クレジット付与セクション */}
            {selectedUser && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h4 className="text-lg font-medium text-white mb-4">
                  クレジット付与 - {selectedUser.nickname}
                </h4>
                <div className="flex space-x-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      付与クレジット数
                    </label>
                    <input
                      type="number"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                      min="1"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={handleAddCredits}
                    disabled={isAddingCredits}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAddingCredits ? '追加中...' : 'クレジット追加'}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case 'sales':
        return (
          <div className="text-gray-400">
            <h3 className="text-xl font-semibold text-indigo-300 mb-2">
              売上管理
            </h3>
            <p>
              チャージ履歴、クレジット消費履歴、月別レポートなどの機能。(現在プレースホルダー)
            </p>
          </div>
        );
      case 'generationHistory':
        return (
          <div className="text-gray-400">
            <h3 className="text-xl font-semibold text-indigo-300 mb-2">
              生成履歴
            </h3>
            <p>
              全ユーザーの画像生成履歴、フィルター機能（ユーザー別、メニュー別、評価別）、詳細表示などの機能。(現在プレースホルダー)
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 h-full">
      <nav className="md:w-1/4 lg:w-1/5 bg-gray-800 p-4 rounded-lg shadow-lg space-y-2 flex-shrink-0">
        {renderAdminNavItem(
          'genMenuCategories',
          'メニューカテゴリ管理',
          <FolderOpenIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'genMenus',
          '生成メニュー管理',
          <ViewGridIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'engines',
          '利用エンジン設定',
          <CogIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'chargeManagement',
          'チャージ管理',
          <CreditCardIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'sales',
          '売上管理',
          <ChartBarIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'goods',
          'グッズ管理',
          <CubeIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'users',
          'ユーザー管理',
          <UsersIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'creditManagement',
          'クレジット管理',
          <CreditCardIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'generationHistory',
          '生成履歴',
          <ClipboardDocumentListIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'suzuriApi',
          'SUZURI API設定',
          <LinkIcon className="w-5 h-5" />,
        )}
        {renderAdminNavItem(
          'stripeApi',
          'Stripe API設定',
          <KeyIcon className="w-5 h-5" />,
        )}
      </nav>
      <div className="md:w-3/4 lg:w-4/5 bg-gray-800 p-6 rounded-lg shadow-lg overflow-y-auto custom-scrollbar">
        {renderSectionContent()}
      </div>
    </div>
  );
};

// SortableCategoryItemコンポーネント
const SortableCategoryItem: React.FC<{
  category: AdminGenerationMenuCategoryItem;
  onEdit: () => void;
  onDelete: () => void;
  isDragging: boolean;
}> = ({ category, onEdit, onDelete, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: category.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-gray-700 p-4 rounded-md shadow flex justify-between items-start transition-opacity ${
        isSortableDragging ? 'opacity-50' : 'opacity-100'
      } ${
        isDragging && !isSortableDragging ? 'pointer-events-none' : ''
      }`}
    >
      <div className="flex items-center space-x-3 flex-grow">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-indigo-300 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 5a2 2 0 110-4 2 2 0 010 4zM12 12a2 2 0 110-4 2 2 0 010 4zM12 19a2 2 0 110-4 2 2 0 010 4z"
            />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-indigo-400">{category.name}</p>
          <p className="text-sm text-gray-300 mt-1">
            {category.description || '説明なし'}
          </p>
        </div>
      </div>
      <div className="space-x-2 flex-shrink-0">
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-indigo-300 transition-colors"
          aria-label={`Edit ${category.name}`}
        >
          <PencilAltIcon className="w-5 h-5" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
          aria-label={`Delete ${category.name}`}
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </li>
  );
};

// SortableGoodsItemコンポーネント
const SortableGoodsItem: React.FC<{
  item: GoodsManagementItem;
  onEdit: () => void;
  isDragging: boolean;
}> = ({ item, onEdit, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: item.id.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-gray-700 p-4 rounded-md shadow flex justify-between items-start transition-opacity cursor-grab ${
        isSortableDragging ? 'opacity-50' : 'opacity-100'
      } ${isDragging && !isSortableDragging ? 'pointer-events-none' : ''}`}
      {...attributes}
      {...listeners}
    >
            <div className="flex items-start space-x-4">
        {item.icon_url ? (
          <img
            src={item.icon_url}
            alt={item.display_name}
            className="w-20 h-20 object-cover rounded-md border border-gray-600 flex-shrink-0"
          />
        ) : (
          <div className="w-20 h-20 bg-gray-600 rounded-md flex items-center justify-center text-gray-500 flex-shrink-0">
            <CubeIcon className="w-10 h-10" />
          </div>
        )}
        <div className="flex-grow">
          <div className="flex items-center space-x-2 mb-1">
            <p className="font-semibold text-indigo-400">{item.display_name}</p>
            <span className={`px-2 py-1 text-xs rounded-full ${item.is_public ? 'bg-green-600 text-green-100' : 'bg-gray-600 text-gray-300'}`}>{item.is_public ? '公開' : '非公開'}</span>
          </div>
          <p className="text-sm text-gray-300">SUZURI ID: {item.suzuri_item_id}</p>
          <p className="text-sm text-gray-300">基本価格: ¥{item.base_price.toLocaleString()}</p>
          <p className="text-sm text-gray-300">最終価格: ¥{item.final_price.toLocaleString()}</p>
          {item.descriptions && item.descriptions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-400">説明:</p>
              {item.descriptions.slice(0, 2).map((desc, index) => (
                <p key={index} className="text-xs text-gray-500 ml-2">{desc}</p>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="space-x-2 flex-shrink-0" data-no-dnd>
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('Edit button clicked for item:', item);
            onEdit();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          className="p-2 text-gray-400 hover:text-indigo-300 pointer-events-auto"
          aria-label={`Edit ${item.display_name}`}
        >
          <PencilAltIcon className="w-5 h-5" />
        </button>
      </div>
    </li>
  );
};

// ... (rest of the AdminView forms: AdminGenMenuCategoryForm, AdminGenMenuForm, AdminGoodsForm, AdminChargeOptionForm remain the same)
// The forms are not included here for brevity but are assumed to be present in the actual file.

const AdminGenMenuCategoryForm: React.FC<{
  item: AdminGenerationMenuCategoryItem;
  onSave: (item: AdminGenerationMenuCategoryItem) => void;
  onCancel: () => void;
}> = ({ item, onSave, onCancel }) => {
  const [currentItem, setCurrentItem] =
    useState<AdminGenerationMenuCategoryItem>(item);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4">
        <h4 className="text-lg font-semibold text-indigo-300">
          {item.id === 0 ? '新規カテゴリ追加' : `編集: ${item.name}`}
        </h4>
        <div>
          <label
            htmlFor="categoryName"
            className="text-sm text-gray-400 block mb-1"
          >
            カテゴリ名
          </label>
          <input
            id="categoryName"
            name="name"
            value={currentItem.name || ''}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
            required
          />
        </div>
        <div>
          <label
            htmlFor="categoryDescription"
            className="text-sm text-gray-400 block mb-1"
          >
            補足説明 (任意)
          </label>
          <textarea
            id="categoryDescription"
            name="description"
            value={currentItem.description || ''}
            onChange={handleChange}
            rows={3}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-gray-200 font-medium"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => onSave(currentItem)}
            className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded text-white font-medium"
            disabled={!currentItem.name.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminGenMenuForm: React.FC<{
  item: AdminGenerationMenuItem;
  categories: AdminGenerationMenuCategoryItem[];
  onSave: (item: AdminGenerationMenuItem) => void;
  onCancel: () => void;
}> = ({ item, categories, onSave, onCancel }) => {
  const [currentItem, setCurrentItem] = useState<AdminGenerationMenuItem>(item);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    if (name === 'engine') {
      setCurrentItem((prev) => ({
        ...prev,
        engine: value as SupportedGenerationEngine,
      }));
    } else if (name === 'categoryId') {
      setCurrentItem((prev) => ({
        ...prev,
        categoryId: value === '' ? null : parseInt(value, 10),
      }));
    } else {
      setCurrentItem((prev) => ({
        ...prev,
        [name]: name === 'credit' ? parseInt(value, 10) || 0 : value,
      }));
    }
  };

  const handleUserInputChange = (
    index: number,
    field: 'label' | 'key',
    value: string,
  ) => {
    const updatedFields = [...(currentItem.promptVariables || [])];
    updatedFields[index] = { ...updatedFields[index], [field]: value };
    setCurrentItem((prev) => ({ ...prev, promptVariables: updatedFields }));
  };

  const addUserInputField = () => {
    setCurrentItem((prev) => ({
      ...prev,
      promptVariables: [
        ...(prev.promptVariables || []),
        { key: '', label: '' },
      ],
    }));
  };

  const removeUserInputField = (index: number) => {
    setCurrentItem((prev) => ({
      ...prev,
      promptVariables: prev.promptVariables?.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-xl space-y-4 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <h4 className="text-lg font-semibold text-indigo-300 mb-2">
          {item.id === 0 ? '新規生成メニュー追加' : `編集: ${item.name}`}
        </h4>
        <div>
          <label htmlFor="name" className="text-sm text-gray-400 block mb-1">
            メニュー名
          </label>
          <input
            id="name"
            name="name"
            value={currentItem.name || ''}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
            required
          />
        </div>
        <div>
          <label
            htmlFor="categoryId"
            className="text-sm text-gray-400 block mb-1"
          >
            カテゴリ (任意)
          </label>
          <select
            id="categoryId"
            name="categoryId"
            value={currentItem.categoryId ?? ''}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
          >
            <option value="">カテゴリなし</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="description"
            className="text-sm text-gray-400 block mb-1"
          >
            簡易説明 (任意)
          </label>
          <textarea
            id="description"
            name="description"
            value={currentItem.description || ''}
            onChange={handleChange}
            rows={2}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
            placeholder="メニューの簡単な説明"
          />
        </div>
        <div>
          <label htmlFor="engine" className="text-sm text-gray-400 block mb-1">
            生成エンジン
          </label>
          <select
            id="engine"
            name="engine"
            value={currentItem.engine || 'Imagen3'}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
          >
            <option value="imagen3">Imagen3</option>
            <option value="ideogram">Ideogram</option>
            <option value="midjourney">Midjourney</option>
            <option value="black_forest_labs">Black Forest Labs</option>
          </select>
        </div>
        <div>
          <label htmlFor="prompt" className="text-sm text-gray-400 block mb-1">
            生成プロンプト
          </label>
          <textarea
            id="prompt"
            name="prompt"
            value={currentItem.prompt || ''}
            onChange={handleChange}
            rows={4}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
            placeholder="例: A futuristic sports car, {{user_color}}, driving on Mars."
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            ユーザー入力は{' '}
            <code className="bg-gray-600 px-1 py-0.5 rounded text-indigo-300">{`{{placeholder_name}}`}</code>{' '}
            形式で挿入できます。
          </p>
        </div>
        <div>
          <label
            htmlFor="negativePrompt"
            className="text-sm text-gray-400 block mb-1"
          >
            ネガティブプロンプト (任意)
          </label>
          <textarea
            id="negativePrompt"
            name="negativePrompt"
            value={currentItem.negativePrompt || ''}
            onChange={handleChange}
            rows={2}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
            placeholder="例: blurry, watermark, text"
          />
        </div>
        <div className="border-t border-gray-700 pt-3 mt-3 space-y-2">
          <div>
            <label
              htmlFor="sampleInputImageUrl"
              className="text-sm text-gray-400 block mb-1"
            >
              サンプル元画像URL (任意)
            </label>
            <input
              id="sampleInputImageUrl"
              name="sampleInputImageUrl"
              value={currentItem.sampleInputImageUrl || ''}
              onChange={handleChange}
              className="w-full bg-gray-700 p-2 rounded text-gray-200"
              placeholder="https://example.com/source.jpg"
            />
          </div>
          <div>
            <label
              htmlFor="sampleResultImageUrl"
              className="text-sm text-gray-400 block mb-1"
            >
              サンプル生成後画像URL (任意)
            </label>
            <input
              id="sampleResultImageUrl"
              name="sampleResultImageUrl"
              value={currentItem.sampleResultImageUrl || ''}
              onChange={handleChange}
              className="w-full bg-gray-700 p-2 rounded text-gray-200"
              placeholder="https://example.com/generated.jpg"
            />
          </div>
        </div>

        <div className="border-t border-gray-700 pt-3 mt-3">
          <h5 className="text-md font-semibold text-indigo-400 mb-2">
            ユーザー追加入力項目設定 (任意)
          </h5>
          {currentItem.promptVariables &&
            currentItem.promptVariables.map((field, index) => (
              <div
                key={index}
                className="mb-3 p-3 border border-gray-600 rounded-md space-y-2 relative"
              >
                <p className="text-xs text-gray-400">入力項目 #{index + 1}</p>
                <div>
                  <label
                    htmlFor={`label-${index}`}
                    className="text-sm text-gray-400 block mb-1"
                  >
                    {field.label.startsWith('追加入力: ')
                      ? field.label.substring('追加入力: '.length)
                      : field.label}
                  </label>
                  <input
                    id={`label-${index}`}
                    value={field.label}
                    onChange={(e) =>
                      handleUserInputChange(index, 'label', e.target.value)
                    }
                    className="w-full bg-gray-700 p-2 rounded text-gray-200"
                    placeholder="例: 車の色, 背景テーマ"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`key-${index}`}
                    className="text-sm text-gray-400 block mb-1"
                  >
                    プロンプト内プレースホルダー名
                  </label>
                  <input
                    id={`key-${index}`}
                    value={field.key}
                    onChange={(e) =>
                      handleUserInputChange(index, 'key', e.target.value)
                    }
                    className="w-full bg-gray-700 p-2 rounded text-gray-200"
                    placeholder="例: user_color (英数字とアンダースコア)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    プロンプト内で{' '}
                    <code className="bg-gray-600 px-1 py-0.5 rounded text-indigo-300">{`{{${field.key || 'placeholder_name'}}}`}</code>{' '}
                    として使用
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeUserInputField(index)}
                  className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-300"
                  aria-label="この入力項目を削除"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          <button
            type="button"
            onClick={addUserInputField}
            className="mt-1 text-sm bg-gray-600 hover:bg-gray-500 text-gray-300 px-3 py-1.5 rounded flex items-center"
          >
            <PlusCircleIcon className="w-4 h-4 mr-1.5" /> テキスト入力項目を追加
          </button>
        </div>

        <div>
          <label
            htmlFor="credit"
            className="text-sm text-gray-400 block mb-1 mt-3"
          >
            消費クレジット
          </label>
          <input
            id="credit"
            type="number"
            name="credit"
            value={currentItem.credit || 0}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-gray-200 font-medium"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('送信するメニュー:', currentItem);
              onSave(currentItem);
            }}
            className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded text-white font-medium"
            disabled={!currentItem.name.trim() || !currentItem.engine.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};



const AdminChargeOptionForm: React.FC<{
  item: AdminChargeOptionItem;
  onSave: (item: AdminChargeOptionItem) => void;
  onCancel: () => void;
}> = ({ item, onSave, onCancel }) => {
  const [currentItem, setCurrentItem] = useState<AdminChargeOptionItem>(item);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setCurrentItem((prev) => ({ ...prev, [name]: checked }));
    } else {
      setCurrentItem((prev) => ({
        ...prev,
        [name]:
          name === 'priceYen' ||
          name === 'creditsAwarded' ||
          name === 'creditsBonus'
            ? parseInt(value, 10) || 0
            : value,
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <h4 className="text-lg font-semibold text-indigo-300">
          {item.id === 0 ? '新規チャージオプション追加' : `編集: ${item.name}`}
        </h4>
        <div>
          <label
            htmlFor="chargeName"
            className="text-sm text-gray-400 block mb-1"
          >
            オプション名
          </label>
          <input
            id="chargeName"
            name="name"
            value={currentItem.name || ''}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
            placeholder="例: 500円お得プラン"
            required
          />
        </div>
        <div>
          <label
            htmlFor="priceYen"
            className="text-sm text-gray-400 block mb-1"
          >
            価格 (円)
          </label>
          <input
            id="priceYen"
            name="priceYen"
            type="number"
            value={currentItem.priceYen}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
          />
        </div>
        <div>
          <label
            htmlFor="creditsAwarded"
            className="text-sm text-gray-400 block mb-1"
          >
            付与クレジット数
          </label>
          <input
            id="creditsAwarded"
            name="creditsAwarded"
            type="number"
            value={currentItem.creditsAwarded}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
          />
        </div>
        <div>
          <label
            htmlFor="creditsBonus"
            className="text-sm text-gray-400 block mb-1"
          >
            ボーナスクレジット (表示用、任意)
          </label>
          <input
            id="creditsBonus"
            name="creditsBonus"
            type="number"
            value={currentItem.creditsBonus || 0}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
          />
        </div>
        <div>
          <label
            htmlFor="displayInfo"
            className="text-sm text-gray-400 block mb-1"
          >
            表示情報テキスト
          </label>
          <input
            id="displayInfo"
            name="displayInfo"
            value={currentItem.displayInfo || ''}
            onChange={handleChange}
            className="w-full bg-gray-700 p-2 rounded text-gray-200"
            placeholder="例: 550 クレジット (+50お得)"
            required
          />
        </div>
        <div className="flex items-center mt-2">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            checked={currentItem.isActive}
            onChange={handleChange}
            className="h-4 w-4 text-indigo-600 border-gray-600 rounded focus:ring-indigo-500 bg-gray-700"
          />
          <label htmlFor="isActive" className="ml-2 text-sm text-gray-300">
            有効にする
          </label>
        </div>
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-gray-200 font-medium"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => onSave(currentItem)}
            className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded text-white font-medium"
            disabled={
              !currentItem.name.trim() || !currentItem.displayInfo.trim()
            }
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminView;
