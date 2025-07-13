import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  PersonalUserSettings,
  CarPhotoAngle,
  CarReferencePhoto,
  CarInfo,
  CarSettings,
  CarSettingsCreateUpdateRequest,
} from '../types';
import { ImageUpload, ImageUploadRef } from '@/components/ImageUpload';
import {
  XMarkIcon,
  CheckCircleIcon as SaveIcon,
} from '../components/icons/HeroIcons';
import { getCarInfo } from '../services/api/car-info';
import {
  fetchCarSettings,
  createOrUpdateCarSettings,
  updateCarSettings,
  deleteCarSettings,
} from '../services/api/car-settings';
import { useToast } from '../contexts/ToastContext';

const carPhotoAngleLabels: Record<CarPhotoAngle, string> = {
  front: 'フロント正面',
  side: '真横',
  rear: 'リア正面',
  front_angled_7_3: '斜め前 7:3',
  rear_angled_7_3: '斜め後 7:3',
};

export const getDefaultPersonalUserSettings = (): PersonalUserSettings => ({
  numberManagement: {
    licensePlateText: '',
    logoMarkImageUrl: undefined,
    originalNumberImageUrl: undefined,
  },
  referenceRegistration: {
    favoriteCarName: '',
    carPhotos: (Object.keys(carPhotoAngleLabels) as CarPhotoAngle[]).map(
      (angle) => ({
        viewAngle: angle,
        label: carPhotoAngleLabels[angle],
        imageUrl: undefined,
      }),
    ),
  },
});

// Type guards
const isCarPhotoAngle = (field: string): field is CarPhotoAngle => {
  return field in carPhotoAngleLabels;
};

const isNumberManagementImageField = (
  field: string,
): field is 'logoMarkImageUrl' | 'originalNumberImageUrl' => {
  return field === 'logoMarkImageUrl' || field === 'originalNumberImageUrl';
};

interface PersonalSettingsViewProps {
  currentUser: User;
  onSave: (settings: PersonalUserSettings) => void;
  onClose: () => void;
}

const PersonalSettingsView: React.FC<PersonalSettingsViewProps> = ({
  currentUser,
  onSave,
  onClose,
}) => {
  const [settings, setSettings] = useState<PersonalUserSettings>(
    currentUser.personalSettings || getDefaultPersonalUserSettings(),
  );

  // 愛車情報の状態管理
  const [carList, setCarList] = useState<CarInfo[]>([]);
  const [selectedCar, setSelectedCar] = useState<CarInfo | null>(null);
  const [isCarSelectModalOpen, setIsCarSelectModalOpen] = useState(false);

  // CarSettings API関連の状態管理
  const [currentCarSettings, setCurrentCarSettings] = useState<CarSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    logo_mark_image?: File;
    original_number_image?: File;
    car_photo_front?: File;
    car_photo_side?: File;
    car_photo_rear?: File;
    car_photo_diagonal?: File;
  }>({});

  // Toast通知
  const { showToast } = useToast();

  // 愛車名を表示形式に変換する関数
  const formatCarName = (car: CarInfo): string => {
    const baseName = `${car.car_brand_en} ${car.car_model_en}`;
    if (car.car_nickname) {
      return `${baseName} [${car.car_nickname}]`;
    }
    return baseName;
  };

  // 愛車情報を取得する
  useEffect(() => {
    const fetchCarInfo = async () => {
      try {
        const carData = await getCarInfo(currentUser.id);
        console.log('取得した愛車情報:', carData);
        console.log('愛車数:', carData.length);
        setCarList(carData);
        
        // 最初の愛車を選択済みに設定
        if (carData.length > 0) {
          setSelectedCar(carData[0]);
        }
      } catch (error) {
        console.error('愛車情報の取得に失敗しました:', error);
        showToast('error', '愛車情報の取得に失敗しました');
      }
    };

    if (currentUser.id) {
      fetchCarInfo();
    }
  }, [currentUser.id]);

  // 選択された愛車のCarSettingsを読み込む
  useEffect(() => {
    const loadCarSettings = async () => {
      if (!selectedCar || !currentUser.id) return;

      setIsLoading(true);
      try {
        const carSettingsData = await fetchCarSettings(
          currentUser.id,
          selectedCar.car_id,
          (error) => {
            console.error('CarSettings取得エラー:', error);
          }
        );

        if (carSettingsData.length > 0) {
          const carSettings = carSettingsData[0]; // user_id + car_idの組み合わせは一意なので最初の1件
          setCurrentCarSettings(carSettings);
          
          // CarSettingsからPersonalUserSettingsに変換
          const newSettings: PersonalUserSettings = {
            numberManagement: {
              licensePlateText: carSettings.license_plate_text || '',
              logoMarkImageUrl: carSettings.logo_mark_image_url || undefined,
              originalNumberImageUrl: carSettings.original_number_image_url || undefined,
            },
            referenceRegistration: {
              favoriteCarName: carSettings.car_name && carSettings.car_name.trim() !== '' ? carSettings.car_name : '',
              carPhotos: (Object.keys(carPhotoAngleLabels) as CarPhotoAngle[]).map(
                (angle) => {
                  let imageUrl: string | undefined;
                  switch (angle) {
                    case 'front':
                      imageUrl = carSettings.car_photo_front_url || undefined;
                      break;
                    case 'side':
                      imageUrl = carSettings.car_photo_side_url || undefined;
                      break;
                    case 'rear':
                      imageUrl = carSettings.car_photo_rear_url || undefined;
                      break;
                    case 'front_angled_7_3':
                      imageUrl = carSettings.car_photo_diagonal_url || undefined;
                      break;
                    case 'rear_angled_7_3':
                      // Note: バックエンドには rear_angled_7_3 対応のフィールドがないため、未対応
                      imageUrl = undefined;
                      break;
                  }
                  
                  return {
                    viewAngle: angle,
                    label: carPhotoAngleLabels[angle],
                    imageUrl,
                  };
                }),
            },
          };
          
          setSettings(newSettings);
        } else {
          // CarSettingsがない場合はデフォルト値を設定
          setCurrentCarSettings(null);
          setSettings(getDefaultPersonalUserSettings());
        }
             } catch (error) {
         console.error('CarSettings読み込みエラー:', error);
         showToast('error', '設定の読み込みに失敗しました');
       } finally {
         setIsLoading(false);
       }
     };

     loadCarSettings();
   }, [selectedCar, currentUser.id]);

   const logoMarkImageUploadRef = useRef<ImageUploadRef>(null);
   const originalNumberImageUploadRef = useRef<ImageUploadRef>(null);
   const carPhotoUploadRefs = useRef<
     Record<CarPhotoAngle, React.RefObject<ImageUploadRef | null>>
   >({
     front: React.createRef(),
     side: React.createRef(),
     rear: React.createRef(),
     front_angled_7_3: React.createRef(),
     rear_angled_7_3: React.createRef(),
   });

  useEffect(() => {
    // 愛車設定画面では personalSettings を使わず、常にデフォルト状態から開始
    const initialSettings = getDefaultPersonalUserSettings();
    setSettings(initialSettings);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const [sectionKey, fieldKey] = name.split('.');

    if (
      sectionKey === 'numberManagement' ||
      sectionKey === 'referenceRegistration'
    ) {
      const section = sectionKey as keyof PersonalUserSettings;
      const field = fieldKey as keyof (
        | PersonalUserSettings['numberManagement']
        | PersonalUserSettings['referenceRegistration']
      );

      setSettings((prev) => ({
        ...prev,
        [section]: {
          ...(prev[section] as object),
          [field]: value,
        },
      }));
    }
  };

  const handleImageUpload = (
    section: 'numberManagement' | 'referenceRegistration',
    field: 'logoMarkImageUrl' | 'originalNumberImageUrl' | CarPhotoAngle,
    file: File | null,
  ) => {
    console.log('🖼️ handleImageUpload called:', { section, field, file: file?.name || 'null' });
    
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        
        // アップロード用にFileオブジェクトを保存
        let uploadFieldName: keyof typeof uploadedFiles;
        switch (field) {
          case 'logoMarkImageUrl':
            uploadFieldName = 'logo_mark_image';
            break;
          case 'originalNumberImageUrl':
            uploadFieldName = 'original_number_image';
            break;
          case 'front':
            uploadFieldName = 'car_photo_front';
            break;
          case 'side':
            uploadFieldName = 'car_photo_side';
            break;
          case 'rear':
            uploadFieldName = 'car_photo_rear';
            break;
          case 'front_angled_7_3':
            uploadFieldName = 'car_photo_diagonal';
            break;
          default:
            return; // rear_angled_7_3 は未対応
        }
        
        setUploadedFiles(prev => ({
          ...prev,
          [uploadFieldName]: file,
        }));

        if (section === 'referenceRegistration' && isCarPhotoAngle(field)) {
          setSettings((prev) => {
            const updatedPhotos = prev.referenceRegistration.carPhotos.map(
              (photo) =>
                photo.viewAngle === field ? { ...photo, imageUrl } : photo,
            );
            return {
              ...prev,
              referenceRegistration: {
                ...prev.referenceRegistration,
                carPhotos: updatedPhotos,
              },
            };
          });
        } else if (
          section === 'numberManagement' &&
          isNumberManagementImageField(field)
        ) {
          setSettings((prev) => ({
            ...prev,
            numberManagement: {
              ...prev.numberManagement,
              [field]: imageUrl,
            },
          }));
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Clear image
      if (section === 'referenceRegistration' && isCarPhotoAngle(field)) {
        setSettings((prev) => {
          const updatedPhotos = prev.referenceRegistration.carPhotos.map(
            (photo) =>
              photo.viewAngle === field
                ? { ...photo, imageUrl: undefined }
                : photo,
          );
          return {
            ...prev,
            referenceRegistration: {
              ...prev.referenceRegistration,
              carPhotos: updatedPhotos,
            },
          };
        });
      } else if (
        section === 'numberManagement' &&
        isNumberManagementImageField(field)
      ) {
        setSettings((prev) => ({
          ...prev,
          numberManagement: {
            ...prev.numberManagement,
            [field]: undefined,
          },
        }));
      }
      
      // アップロードファイルからも削除
      const fieldToDelete = (() => {
        switch (field) {
          case 'logoMarkImageUrl': return 'logo_mark_image';
          case 'originalNumberImageUrl': return 'original_number_image';
          case 'front': return 'car_photo_front';
          case 'side': return 'car_photo_side';
          case 'rear': return 'car_photo_rear';
          case 'front_angled_7_3': return 'car_photo_diagonal';
          default: return null;
        }
      })();
      
      if (fieldToDelete) {
        setUploadedFiles(prev => {
          const { [fieldToDelete]: removed, ...rest } = prev;
          return rest;
        });
      }

      // 即座にサーバーから削除
      console.log('🗑️ 画像削除条件チェック:', { 
        currentCarSettings: !!currentCarSettings, 
        selectedCar: !!selectedCar,
        currentCarSettingsId: currentCarSettings?.id,
        selectedCarId: selectedCar?.car_id 
      });
      
      if (currentCarSettings && selectedCar) {
        console.log('✅ 削除条件満たしているため、handleImmediateDeleteを呼び出します');
        handleImmediateDelete(field);
      } else {
        console.log('❌ 削除条件を満たしていません - サーバー削除をスキップ');
      }
    }
  };

  const handleImmediateDelete = async (field: 'logoMarkImageUrl' | 'originalNumberImageUrl' | CarPhotoAngle) => {
    console.log('🚀 handleImmediateDelete 開始:', { field });
    
    if (!selectedCar || !currentUser.id || !currentCarSettings) {
      console.log('❌ handleImmediateDelete: 必要な条件が不足', {
        selectedCar: !!selectedCar,
        userId: !!currentUser.id,
        currentCarSettings: !!currentCarSettings
      });
      return;
    }

    console.log('📋 削除対象の情報:', {
      carSettingsId: currentCarSettings.id,
      userId: currentUser.id,
      carId: selectedCar.car_id,
      field
    });

    try {
      const updateData: Partial<CarSettingsCreateUpdateRequest> = {
        user_id: currentUser.id,
        car_id: selectedCar.car_id,
      };
      
      // 削除フラグを設定
      switch (field) {
        case 'logoMarkImageUrl':
          updateData.delete_logo_mark_image = true;
          break;
        case 'originalNumberImageUrl':
          updateData.delete_original_number_image = true;
          break;
        case 'front':
          updateData.delete_car_photo_front = true;
          break;
        case 'side':
          updateData.delete_car_photo_side = true;
          break;
        case 'rear':
          updateData.delete_car_photo_rear = true;
          break;
        case 'front_angled_7_3':
          updateData.delete_car_photo_diagonal = true;
          break;
      }

      console.log('📤 API削除リクエスト送信:', updateData);
      const response = await updateCarSettings(currentCarSettings.id, updateData);
      console.log('📥 API削除レスポンス:', response);
      
      if (response) {
        console.log('✅ サーバー削除成功 - CarSettingsを再読み込み');
        // サーバー削除成功 → CarSettingsを再読み込み
        const carSettingsData = await fetchCarSettings(currentUser.id, selectedCar.car_id);
        console.log('🔄 再読み込み結果:', carSettingsData);
        if (carSettingsData.length > 0) {
          setCurrentCarSettings(carSettingsData[0]);
        }
        showToast('success', '画像を削除しました');
      } else {
        console.log('❌ サーバー削除失敗');
        showToast('error', '画像の削除に失敗しました');
      }
    } catch (error) {
      console.error('画像削除エラー:', error);
      showToast('error', '画像の削除に失敗しました');
    }
  };

  const handleDeleteAllCarSettings = async () => {
    if (!selectedCar || !currentUser.id || !currentCarSettings) {
      showToast('error', '削除対象の愛車設定が見つかりません');
      return;
    }

    const carName = formatCarName(selectedCar);
    const confirmMessage = `愛車「${carName}」の設定を完全に削除しますか？\n\nこの操作は元に戻すことができません。\n- 保存されたすべての画像\n- ナンバープレートの設定\n- 愛車名前の設定\n\nすべてが削除されます。`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await deleteCarSettings(currentCarSettings.id, (error: unknown) => {
        console.error('愛車設定削除エラー:', error);
      });

      if (success) {
        // 削除成功 → 状態をリセット
        setCurrentCarSettings(null);
        setUploadedFiles({});
        
        // PersonalUserSettingsも初期化
        setSettings(getDefaultPersonalUserSettings());
        
        showToast('success', `愛車「${carName}」の設定を削除しました`);
      } else {
        showToast('error', '愛車設定の削除に失敗しました');
      }
    } catch (error) {
      console.error('愛車設定削除処理エラー:', error);
      showToast('error', '愛車設定の削除に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
         if (!selectedCar || !currentUser.id) {
       showToast('error', '愛車が選択されていません');
       return;
     }

     setIsLoading(true);

     try {
       // CarSettingsCreateUpdateRequestを作成
       const carSettingsRequest: CarSettingsCreateUpdateRequest = {
         user_id: currentUser.id,
         car_id: selectedCar.car_id,
         license_plate_text: settings.numberManagement.licensePlateText || '',
         car_name: settings.referenceRegistration.favoriteCarName || '',
         ...uploadedFiles, // File オブジェクトを含める
       };

       const result = await createOrUpdateCarSettings(
         carSettingsRequest,
         (error) => {
           console.error('CarSettings保存エラー:', error);
         }
       );

       if (result) {
         setCurrentCarSettings(result);
         // ローカルのアップロードファイル状態をクリア
         setUploadedFiles({});
         showToast('success', '設定を保存しました');
         
         // 従来のonSaveコールバックも呼び出し（互換性のため）
         onSave(settings);
       } else {
         showToast('error', '設定の保存に失敗しました');
       }
     } catch (error) {
       console.error('CarSettings保存処理エラー:', error);
       showToast('error', '設定の保存に失敗しました');
     } finally {
       setIsLoading(false);
     }
  };

  const getCarPhotoUrl = (angle: CarPhotoAngle): string | undefined => {
    const photo = settings.referenceRegistration.carPhotos.find(
      (p) => p.viewAngle === angle,
    );
    return photo?.imageUrl;
  };

  const getCarSettingsImageUrl = (angle: CarPhotoAngle): string | undefined => {
    if (!currentCarSettings) {
      // ログを一度だけ出力するように制御
      return undefined;
    }
    
    let imageUrl: string | undefined;
    switch (angle) {
      case 'front':
        imageUrl = currentCarSettings.car_photo_front_url || undefined;
        break;
      case 'side':
        imageUrl = currentCarSettings.car_photo_side_url || undefined;
        break;
      case 'rear':
        imageUrl = currentCarSettings.car_photo_rear_url || undefined;
        break;
      case 'front_angled_7_3':
      case 'rear_angled_7_3':
        imageUrl = currentCarSettings.car_photo_diagonal_url || undefined;
        break;
      default:
        imageUrl = undefined;
    }
    
    // ログ出力を制御（開発時のみ、かつ画像がある場合のみ）
    if (process.env.NODE_ENV === 'development' && imageUrl) {
      console.log(`📷 getCarSettingsImageUrl(${angle}):`, imageUrl);
    }
    return imageUrl;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-indigo-400">愛車設定</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
          >
            <XMarkIcon className="w-7 h-7" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-6 custom-scrollbar pr-2 flex-grow">
          {/* 愛車情報表示 - 愛車設定直下に配置 */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    愛車
                  </label>
                  <div className="text-lg text-white">
                    {selectedCar ? formatCarName(selectedCar) : '車両を選択してください'}
                  </div>
                </div>
                {/* 愛車のサムネイル画像 */}
                {selectedCar?.car_image_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={selectedCar.car_image_url}
                      alt={formatCarName(selectedCar)}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-600"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
              {/* 愛車が1台以上ある場合に変更ボタンを表示 */}
              {carList.length >= 1 && (
                <button
                  type="button"
                  onClick={() => setIsCarSelectModalOpen(true)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-md transition-colors"
                >
                  変更
                </button>
              )}
            </div>
          </div>

          {/* Number Management Section */}
          <section className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
            <h3 className="text-xl font-medium text-indigo-300 border-b border-gray-600 pb-2">
              ナンバー管理
            </h3>
            <div>
              <label
                htmlFor="nmLicensePlateText"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                文字列 (例: 横浜 330 な 2960)
              </label>
              <input
                type="text"
                id="nmLicensePlateText"
                name="numberManagement.licensePlateText"
                value={settings.numberManagement.licensePlateText || ''}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="横浜 330 な 2960"
              />
            </div>
            <ImageUpload
              ref={logoMarkImageUploadRef}
              label="ロゴマーク画像"
              initialPreviewUrl={currentCarSettings?.logo_mark_image_url || undefined}
              showDeleteButton={true}
              onImageSelect={(file) =>
                handleImageUpload('numberManagement', 'logoMarkImageUrl', file)
              }
            />
            <ImageUpload
              ref={originalNumberImageUploadRef}
              label="オリジナルナンバー画像"
              initialPreviewUrl={currentCarSettings?.original_number_image_url || undefined}
              showDeleteButton={true}
              onImageSelect={(file) =>
                handleImageUpload(
                  'numberManagement',
                  'originalNumberImageUrl',
                  file,
                )
              }
            />
          </section>

          {/* Reference Registration Section */}
          <section className="space-y-4 p-4 bg-gray-700/50 rounded-lg">
            <h3 className="text-xl font-medium text-indigo-300 border-b border-gray-600 pb-2">
              リファレンス登録
            </h3>
            <div>
              <label
                htmlFor="rrFavoriteCarName"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                愛車名前
              </label>
              <input
                type="text"
                id="rrFavoriteCarName"
                name="referenceRegistration.favoriteCarName"
                value={settings.referenceRegistration.favoriteCarName || ''}
                onChange={handleInputChange}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="車両名"
              />
            </div>
            <h4 className="text-md font-medium text-gray-300 pt-2">
              愛車写真登録
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {settings.referenceRegistration.carPhotos.map((photoSlot) => (
                <ImageUpload
                  key={photoSlot.viewAngle}
                  ref={carPhotoUploadRefs.current[photoSlot.viewAngle]}
                  label={photoSlot.label}
                  initialPreviewUrl={getCarSettingsImageUrl(photoSlot.viewAngle)}
                  showDeleteButton={true}
                  onImageSelect={(file) =>
                    handleImageUpload(
                      'referenceRegistration',
                      photoSlot.viewAngle,
                      file,
                    )
                  }
                />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700 flex justify-between items-center">
          {/* 左側：削除ボタン（設定が存在する場合のみ表示） */}
          <div>
            {currentCarSettings && selectedCar && (
              <button
                type="button"
                onClick={handleDeleteAllCarSettings}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white font-medium rounded-lg transition flex items-center"
              >
                <svg 
                  className="w-4 h-4 mr-2" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                  />
                </svg>
                {isLoading ? '削除中...' : '設定を削除'}
              </button>
            )}
          </div>
          
          {/* 右側：キャンセル・保存ボタン */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-600 hover:bg-gray-500 text-gray-200 font-medium rounded-lg transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:opacity-50 text-white font-medium rounded-lg transition flex items-center"
            >
              <SaveIcon className="w-5 h-5 mr-2" />
              {isLoading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </form>

      {/* 愛車選択モーダル */}
      {isCarSelectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-medium text-indigo-300">愛車を選択</h3>
              <button
                type="button"
                onClick={() => setIsCarSelectModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {carList.map((car) => (
                <button
                  key={car.car_id}
                  type="button"
                  onClick={() => {
                    setSelectedCar(car);
                    setIsCarSelectModalOpen(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedCar?.car_id === car.car_id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* 愛車のサムネイル画像 */}
                    {car.car_image_url ? (
                      <div className="flex-shrink-0">
                        <img
                          src={car.car_image_url}
                          alt={formatCarName(car)}
                          className="w-12 h-12 object-cover rounded-lg border border-gray-600"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center">
                        <div className="text-xs text-gray-400">🚗</div>
                      </div>
                    )}
                    
                    {/* 愛車情報 */}
                    <div className="flex-grow">
                      <div className="font-medium">{formatCarName(car)}</div>
                      <div className={`text-sm ${
                        selectedCar?.car_id === car.car_id ? 'text-indigo-200' : 'text-gray-400'
                      }`}>
                        {car.car_brand_n} {car.car_model_n}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalSettingsView;
