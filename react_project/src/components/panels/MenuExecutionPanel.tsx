import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  AspectRatio,
  AdminGenerationMenuItem,
  AdminGenerationMenuCategoryItem,
  MenuExecutionFormData,
} from '../../types';
import { AVAILABLE_ASPECT_RATIOS } from '../../constants';
import { ImageUpload, ImageUploadRef } from '@/components/ImageUpload';
import { SampleImagesModal } from '../modals/SampleImagesModal';
import {
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  BoltIcon,
  DocumentTextIcon,
  PhotoIcon as CameraIcon,
  ListBulletIcon,
  BeakerIcon,
  EyeIcon,
} from '../icons/HeroIcons';
import { useCategories } from '@/contexts/CategoriesContext';
import { useMenus } from '@/contexts/MenusContext';
import { useCredits } from '@/contexts/CreditsContext';

interface MenuExecutionPanelProps {
  onGenerateClick: (formData: MenuExecutionFormData) => void;
  isGenerating: boolean;
  formData: MenuExecutionFormData;
  setFormData: React.Dispatch<React.SetStateAction<MenuExecutionFormData>>;
}

export const MenuExecutionPanel: React.FC<MenuExecutionPanelProps> = ({
  onGenerateClick,
  isGenerating,
  formData,
  setFormData,
}) => {
  const categories = useCategories();
  const menus = useMenus();
  const credits = useCredits();

  const imageUploadRef = useRef<ImageUploadRef>(null);
  const [showSampleModal, setShowSampleModal] = useState(false);

  useEffect(() => {
    let initialCategory: AdminGenerationMenuCategoryItem | null = null;

    if (!formData.category) {
      initialCategory =
        categories && 0 < categories.length ? categories[0] : null;
      setFormData((prev) => ({
        ...prev,
        category: initialCategory,
      }));
    }

    if (!formData.menu) {
      const initialMenu =
        initialCategory && menus
          ? (menus.find((m) => m.categoryId === initialCategory.id) ?? null)
          : null;
      setFormData((prev) => ({
        ...prev,
        menu: initialMenu,
      }));
    }
  }, []); // onMount

  const handleCategoryChange = (categoryId: number) => {
    setFormData((prev) => ({
      ...prev,
      category: categories.find((c) => c.id === categoryId) ?? null,
      menu: menus.find((menu) => menu.categoryId === categoryId) ?? null,
      promptVariables: [],
    }));
  };

  const handleMenuChange = (menuId: number) => {
    setFormData((prev) => ({
      ...prev,
      menu: menus.find((menu) => menu.id === menuId) ?? null,
      promptVariables: [],
    }));
  };

  const handleImageSelectedByUploader = useCallback((file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      image: file,
      inputType: file ? 'upload' : 'prompt',
    }));
  }, []);

  const handleAdditionalPromptForMyCar = useCallback((text: string) => {
    setFormData((prev) => ({
      ...prev,
      additionalPromptForMyCar: text,
    }));
  }, []);

  const handleAdditionalPromptForOthers = useCallback((text: string) => {
    setFormData((prev) => ({
      ...prev,
      additionalPromptForOthers: text,
    }));
  }, []);

  const handleAspectRatio = useCallback((aspectRatio: AspectRatio) => {
    setFormData((prev) => ({
      ...prev,
      aspectRatio: aspectRatio,
    }));
  }, []);

  const handlePromptVariablesChange = (key: string, value: string) => {
    setFormData((prev) => {
      const updated = prev.promptVariables.some((p) => p.key === key)
        ? prev.promptVariables.map((p) => (p.key === key ? { ...p, value } : p)) // 既存のkeyを更新
        : [...prev.promptVariables, { key, value }]; // 新しいkeyを追加

      return {
        ...prev,
        promptVariables: updated,
      };
    });
  };

  const handleInputTypeChange = (inputType: 'prompt' | 'upload') => {
    setFormData((prev) => ({
      ...prev,
      inputType: inputType,
    }));
  };

  const selectedMenuCredit = formData.menu?.credit ?? 0;
  const canGenerate =
    credits >= selectedMenuCredit &&
    formData.menu &&
    (formData.inputType === 'upload'
      ? formData.image !== null
      : formData.additionalPromptForMyCar?.trim() &&
        (!formData.menu.promptVariables ||
          formData.menu.promptVariables.length === 0 ||
          formData.menu.promptVariables.length ===
            formData.promptVariables.length));

  const availableMenus = menus.filter(
    (m) => m.categoryId === formData.category?.id,
  );

  const handleGeneration = () => {
    onGenerateClick(formData);
  };

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl flex flex-col h-full">
      <div className="flex-grow space-y-4 overflow-y-auto custom-scrollbar pr-1 pb-2">
        <div>
          <h3 className="text-md lg:text-lg font-semibold text-indigo-400 mb-2 flex items-center">
            <ListBulletIcon className="w-5 h-5 lg:w-6 lg:h-6 mr-2" />
            カテゴリ選択
          </h3>
          <select
            value={formData.category?.id ?? ''}
            onChange={(e) => handleCategoryChange(parseInt(e.target.value, 10))}
            className="w-full p-2.5 text-xs lg:text-sm bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
          >
            <option value="" disabled>
              カテゴリを選択...
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {formData.category && 0 < availableMenus.length && (
          <div>
            <div className="flex justify-between items-center mt-3 mb-2">
              <h3 className="text-md lg:text-lg font-semibold text-indigo-400 flex items-center">
                <SparklesIcon className="w-5 h-5 lg:w-6 lg:h-6 mr-2" />
                生成メニュー選択
              </h3>
              {formData.menu &&
                (formData.menu.sampleInputImageUrl ||
                  formData.menu.sampleResultImageUrl) && (
                  <button
                    onClick={() => setShowSampleModal(true)}
                    className="text-xs bg-gray-600 hover:bg-gray-500 text-indigo-300 px-2 py-1 rounded-md flex items-center"
                    title="このメニューの生成サンプルを見る"
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />{' '}
                    生成後のサンプルはこちら
                  </button>
                )}
            </div>
            <select
              value={formData.menu?.id || ''}
              onChange={(e) => handleMenuChange(parseInt(e.target.value, 10))}
              className="w-full p-2.5 text-xs lg:text-sm bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
            >
              <option value="" disabled>
                メニューを選択...
              </option>
              {availableMenus.map((menu) => (
                <option key={menu.id} value={menu.id}>
                  {menu.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {formData.menu && (
          <div>
            <div className="mt-3 pt-3 border-t border-gray-700/60 space-y-3">
              <p className="text-sm text-gray-300 italic">
                {formData.menu.description}
              </p>

              {formData.menu.promptVariables &&
                0 < formData.menu.promptVariables.length && (
                  <div>
                    <h4 className="text-sm font-semibold text-indigo-300 mb-1.5">
                      追加入力:
                    </h4>
                    {formData.menu.promptVariables.map((field) => (
                      <div key={field.key} className="mb-2.5">
                        <label
                          htmlFor={field.key}
                          className="block text-xs lg:text-sm font-medium text-gray-300 mb-0.5"
                        >
                          {field.label}
                        </label>
                        <input
                          type="text"
                          id={field.key}
                          value={
                            formData.promptVariables.find(
                              (v) => v.key === field.key,
                            )?.value || ''
                          }
                          onChange={(e) =>
                            handlePromptVariablesChange(
                              field.key,
                              e.target.value,
                            )
                          }
                          placeholder={`${field.label.replace(/^追加入力:\s*/, '')} を入力`}
                          className="w-full p-2 text-xs lg:text-sm bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 placeholder-gray-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

              <div>
                <h3 className="text-md font-semibold text-indigo-400 mb-1 mt-2 flex items-center">
                  <BeakerIcon className="w-5 h-5 mr-1.5" />
                  愛車入力ソース
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {(['upload', 'prompt'] as const).map((source) => (
                    <button
                      key={source}
                      onClick={() => handleInputTypeChange(source)}
                      aria-pressed={formData.inputType === source}
                      className={`p-2 rounded-md text-xs font-medium transition-all duration-150 ease-in-out flex items-center justify-center
                        ${formData.inputType === source ? 'bg-indigo-600 text-white ring-1 ring-indigo-400' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
                    >
                      {source === 'upload' ? (
                        <>
                          <CameraIcon className="w-4 h-4 mr-1" />
                          画像アップロード
                        </>
                      ) : (
                        <>
                          <DocumentTextIcon className="w-4 h-4 mr-1" />
                          テキスト入力ベース
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {formData.inputType === 'upload' && (
                <>
                  <ImageUpload
                    ref={imageUploadRef}
                    onImageSelect={handleImageSelectedByUploader}
                    label="基準にする愛車写真"
                    uploadedFile={formData.image}
                  />
                </>
              )}
              {formData.inputType === 'prompt' && (
                <div>
                  <label
                    htmlFor="additionalPromptForMyCar"
                    className="block text-xs lg:text-sm font-medium text-gray-300 mb-1"
                  >
                    主な被写体の説明 (テキスト入力ベース時)
                  </label>
                  <textarea
                    id="additionalPromptForMyCar"
                    value={formData.additionalPromptForMyCar}
                    onChange={(e) =>
                      handleAdditionalPromptForMyCar(e.target.value)
                    }
                    rows={2}
                    placeholder="例: 赤い流線型のスポーツカー、未来的なデザイン"
                    className="w-full p-2 text-xs lg:text-sm bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 placeholder-gray-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-2">
              <h3 className="text-md font-semibold text-indigo-400 mb-2 mt-2 flex items-center">
                <AdjustmentsHorizontalIcon className="w-5 h-5 lg:w-6 lg:h-6 mr-2" />
                追加共通オプション
              </h3>
              <div>
                <label
                  htmlFor="aspectRatio"
                  className="block text-xs lg:text-sm font-medium text-gray-300 mb-1"
                >
                  画像比率
                </label>
                <select
                  id="aspectRatio"
                  value={formData.aspectRatio}
                  onChange={(e) =>
                    handleAspectRatio(e.target.value as AspectRatio)
                  }
                  className="w-full p-2 text-xs lg:text-sm bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-200"
                >
                  {AVAILABLE_ASPECT_RATIOS.map((ar) => (
                    <option key={ar} value={ar}>
                      {ar}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3">
                <label
                  htmlFor="additionalPromptForOthers"
                  className="block text-xs lg:text-sm font-medium text-gray-300 mb-1"
                >
                  追加プロンプト (全体に効果、任意)
                </label>
                <input
                  type="text"
                  id="additionalPromptForOthers"
                  value={formData.additionalPromptForOthers}
                  onChange={(e) =>
                    handleAdditionalPromptForOthers(e.target.value)
                  }
                  placeholder="例: 超リアル、映画風ライト、魚眼レンズ"
                  className="w-full p-2 text-xs lg:text-sm bg-gray-700 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-gray-200 placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-700">
        <div className="mb-3">
          <p className="text-xs lg:text-sm text-gray-400">
            生成コスト:{' '}
            <span className="font-semibold text-indigo-400">
              {selectedMenuCredit} クレジット
            </span>
          </p>
          <p className="text-xs lg:text-sm text-gray-400">
            保有クレジット:{' '}
            <span className="font-semibold text-green-400">
              {credits} クレジット
            </span>
          </p>
          {!canGenerate && credits < selectedMenuCredit && (
            <p className="text-xs lg:text-sm text-red-400 mt-1">
              クレジットが不足しています。
            </p>
          )}
          {!canGenerate && credits >= selectedMenuCredit && !formData.menu && (
            <p className="text-xs lg:text-sm text-yellow-400 mt-1">
              カテゴリとメニューを選択してください。
            </p>
          )}
          {!canGenerate &&
            credits >= selectedMenuCredit &&
            formData.menu &&
            formData.inputType === 'upload' &&
            !formData.image && (
              <p className="text-xs lg:text-sm text-yellow-400 mt-1">
                基準画像をアップロードまたは選択してください。
              </p>
            )}
          {!canGenerate &&
            credits >= selectedMenuCredit &&
            formData.menu &&
            formData.inputType === 'prompt' &&
            (!formData.additionalPromptForMyCar?.trim() ||
              !(
                formData.menu.promptVariables &&
                0 < formData.menu.promptVariables.length &&
                formData.menu.promptVariables.some(
                  (v) =>
                    formData.promptVariables.find(
                      (inputVar) => inputVar.key === v.key,
                    ) &&
                    formData.promptVariables.some(
                      (inputVar) => inputVar.value.trim() === '',
                    ),
                )
              )) && (
              <p className="text-xs lg:text-sm text-yellow-400 mt-1">
                「主な被写体の説明」またはメニュー固有の「追加入力」を入力してください。
              </p>
            )}
        </div>
        <button
          onClick={() => handleGeneration()}
          disabled={isGenerating || !canGenerate}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-lg shadow-md transition duration-150 ease-in-out flex items-center justify-center text-sm lg:text-base"
          aria-label={`画像を生成 (${selectedMenuCredit} クレジット)`}
        >
          <BoltIcon className="w-5 h-5 mr-2" />
          {isGenerating
            ? '生成中...'
            : `画像を生成 (${selectedMenuCredit} クレジット)`}
        </button>
      </div>
      {formData.menu && showSampleModal && (
        <SampleImagesModal
          isOpen={showSampleModal}
          onClose={() => setShowSampleModal(false)}
          sourceUrl={formData.menu.sampleInputImageUrl}
          generatedUrl={formData.menu.sampleResultImageUrl}
          menuName={formData.menu.name}
        />
      )}
    </div>
  );
};
