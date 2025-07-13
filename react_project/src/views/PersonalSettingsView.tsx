import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  PersonalUserSettings,
  CarPhotoAngle,
  CarReferencePhoto,
} from '../types';
import { ImageUpload, ImageUploadRef } from '@/components/ImageUpload';
import {
  XMarkIcon,
  CheckCircleIcon as SaveIcon,
} from '../components/icons/HeroIcons';

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

  const logoMarkImageUploadRef = useRef<ImageUploadRef>(null);
  const originalNumberImageUploadRef = useRef<ImageUploadRef>(null);
  const carPhotoUploadRefs = useRef<
    Record<CarPhotoAngle, React.RefObject<ImageUploadRef>>
  >({
    front: React.createRef(),
    side: React.createRef(),
    rear: React.createRef(),
    front_angled_7_3: React.createRef(),
    rear_angled_7_3: React.createRef(),
  });

  useEffect(() => {
    const initialSettings = JSON.parse(
      JSON.stringify(
        currentUser.personalSettings || getDefaultPersonalUserSettings(),
      ),
    );

    // Ensure carPhotos array is correctly initialized and has labels
    const defaultCarPhotos =
      getDefaultPersonalUserSettings().referenceRegistration.carPhotos;
    const currentCarPhotos =
      initialSettings.referenceRegistration.carPhotos || [];

    const newCarPhotos = defaultCarPhotos.map((defaultPhoto) => {
      const existingPhoto = currentCarPhotos.find(
        (p: CarReferencePhoto) => p.viewAngle === defaultPhoto.viewAngle,
      );
      return {
        ...defaultPhoto, // Start with default structure (includes label)
        ...(existingPhoto || {}), // Override with existing data if present
        label:
          carPhotoAngleLabels[defaultPhoto.viewAngle] || defaultPhoto.viewAngle, // Ensure label is correct
      };
    });
    initialSettings.referenceRegistration.carPhotos = newCarPhotos;
    setSettings(initialSettings);
  }, [currentUser.personalSettings]);

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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
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
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  const getCarPhotoUrl = (angle: CarPhotoAngle): string | undefined => {
    const photo = settings.referenceRegistration.carPhotos.find(
      (p) => p.viewAngle === angle,
    );
    return photo?.imageUrl;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-indigo-400">個人設定</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
          >
            <XMarkIcon className="w-7 h-7" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-6 custom-scrollbar pr-2 flex-grow">
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
              onImageSelect={(file) =>
                handleImageUpload('numberManagement', 'logoMarkImageUrl', file)
              }
              initialPreviewUrl={settings.numberManagement.logoMarkImageUrl}
            />
            <ImageUpload
              ref={originalNumberImageUploadRef}
              label="オリジナルナンバー画像"
              onImageSelect={(file) =>
                handleImageUpload(
                  'numberManagement',
                  'originalNumberImageUrl',
                  file,
                )
              }
              initialPreviewUrl={
                settings.numberManagement.originalNumberImageUrl
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
                placeholder="例: マイ・ロードスター"
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
                  onImageSelect={(file) =>
                    handleImageUpload(
                      'referenceRegistration',
                      photoSlot.viewAngle,
                      file,
                    )
                  }
                  initialPreviewUrl={getCarPhotoUrl(photoSlot.viewAngle)}
                />
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-600 hover:bg-gray-500 text-gray-200 font-medium rounded-lg transition"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition flex items-center"
          >
            <SaveIcon className="w-5 h-5 mr-2" />
            保存
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalSettingsView;
