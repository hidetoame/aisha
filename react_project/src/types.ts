export type ToastType = 'success' | 'error' | 'info';

// 電話番号ログイン関連の型定義
export interface PhoneLoginRequest {
  phoneNumber: string;
}

export interface PhoneLoginResponse {
  success: boolean;
  message?: string;
  sessionId?: string;
}

export interface PhoneVerificationRequest {
  phoneNumber: string;
  verificationCode: string;
  sessionId: string;
}

export interface PhoneVerificationResponse {
  success: boolean;
  message?: string;
  isNewUser?: boolean;
  userId?: string;
  token?: string;
}

export interface PhoneUserRegistrationRequest {
  phoneNumber: string;
  nickname: string;
  sessionId: string;
}

export interface PhoneUserRegistrationResponse {
  success: boolean;
  message?: string;
  userId: string;
  token: string;
}

export interface PhoneUser {
  id: string;
  phoneNumber: string;
  nickname: string;
  isAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  isAdmin?: boolean; // Added for admin flag
  personalSettings?: PersonalUserSettings; // Added
  loginType?: 'mygarage' | 'phone'; // Added for login type tracking
  phoneNumber?: string; // Added for phone login users
}

export interface CreditsRequestParams {
  credits: number;
}

export interface CreditsFetchParams {
  credits: number;
}

export interface CreditsOperationResponseParams {
  newCredits: number;
}

export enum AspectRatio {
  Original = "Original",
  Square_1_1 = "1:1",
  Landscape_16_9 = "16:9",
  Portrait_9_16 = "9:16",
  Landscape_4_3 = "4:3",
  Portrait_3_4 = "3:4",
}

export interface PromptVariableInExecution {
  key: string;
  value: string;
}

// MenuExecutionPanel上の情報
export interface MenuExecutionFormData {
  category: AdminGenerationMenuCategoryItem | null;
  menu: AdminGenerationMenuItem | null;
  image: File | null;
  additionalPromptForMyCar?: string;
  additionalPromptForOthers?: string;
  aspectRatio?: AspectRatio;
  promptVariables: PromptVariableInExecution[];
  inputType: 'upload' | 'prompt';
}

// MenuExecution API実行時のリクエストパラメータ群
export interface MenuExecutionRequestParams {
  menuId: number; // メニューIDはリクエストパラメータではなくURLに含める
  image?: File;
  additionalPromptForMyCar?: string;
  additionalPromptForOthers?: string;
  aspectRatio?: AspectRatio;
  promptVariables?: PromptVariableInExecution[];
}

export interface MenuExecutionResponseParams {
  generatedImageUrl: string;
  promptFormatted: string;
  createdAt: Date;
}

export interface GenerationOptions {
  selectedMenuId?: string; 
  userInputValues?: Record<string, string>; 

  finalPromptForService: string; 
  generationEngineForService: SupportedGenerationEngine; 
  creditCostForService: number;

  aspectRatio: AspectRatio;
  additionalInput?: string; 
  
  uploadedCarImageFile?: File | null; 
  uploadedCarImageDataUrl?: string | null; 
  originalUploadedImageDataUrl?: string | null; 
}

export interface GeneratedImage {
  id: string;
  url: string; 
  // sourceImageUrl?: string; 
  // originalUploadedImageDataUrl?: string; 
  displayPrompt: string; 
  menuName?: string;
  usedFormData: MenuExecutionFormData;
  fullOptions: GenerationOptions; // コメントアウトを解除
  timestamp: Date;
  rating?: 'good' | 'bad';
  isPublic: boolean; 
  authorName?: string;
  isSavedToLibrary?: boolean; // ライブラリに明示的に保存されたかどうか
  comment_count?: number; // コメント数（スネークケース）
  like_count?: number; // いいね数（スネークケース）
  commentCount?: number; // コメント数（キャメルケース）
  likeCount?: number; // いいね数（キャメルケース）
  goods_creation_count?: number; // グッズ作成回数
}

export interface GoodsVariation {
  id: string; 
  typeName: string; 
  options: string[]; 
}

export interface GoodsCreationRecord {
  id: string;
  goodsName: string;
  imageId: string; 
  imageUrl?: string; 
  prompt?: string; 
  timestamp: Date;
  creditCost: number;
  selectedVariations?: Record<string, string>; 
}

export interface Plan {
  id: number;
  name: string;
  price: number; 
  credits: number; 
}

export interface SuzuriItem { 
  id: string; 
  name: string; 
  apiId: string; 
  creditCost: number;
  variations?: GoodsVariation[];
  imageUrl?: string; 
}

export type SupportedGenerationEngine = 'imagen3' | 'ideogram' | 'midjourney' | 'black_forest_labs';

export interface AdminGenerationMenuCategoryItem {
  id: number;
  name: string;
  description?: string;
}

export interface AdminGenerationMenuItem {
  id: number;
  name: string;
  categoryId?: number | null; 
  description?: string; 
  engine: SupportedGenerationEngine;
  prompt: string; 
  negativePrompt?: string;
  promptVariables?: { 
    label: string; 
    key: string;      
  }[];
  credit: number;
  sampleInputImageUrl?: string; 
  sampleResultImageUrl?: string; 
}

export interface AdminGoodsItem {
  id: string;
  suzuriApiId: string;
  goodsName: string;
  creditCost: number;
  variations?: GoodsVariation[];
  imageUrl?: string; 
}

export interface AdminChargeOptionItem {
  id: number;
  name: string; 
  priceYen: number;
  creditsAwarded: number;
  creditsBonus?: number; 
  displayInfo: string; 
  isActive: boolean;
}

export type AdminSection = 
  | 'genMenuCategories' 
  | 'genMenus' 
  | 'chargeManagement' 
  | 'engines' 
  | 'generationHistory' 
  | 'sales' 
  | 'users' 
  | 'goods' 
  | 'suzuriApi' 
  | 'stripeApi';

export interface SharePageParams {
  sharedByUser: string;
  sharedDate: string;
  sharedImageUrl: string;
  sharedPrompt?: string;
  sharedMenuName?: string;
}

export type ActionAfterLoadType = 
  | 'extend' 
  | { 
      type: 'loadFromLibrary'; 
      formData: MenuExecutionFormData; 
      generatedImageUrl?: string; 
    } 
  | null;
export type AppViewMode = 'generator' | 'timeline'; 

// --- START: Personal Settings Types ---
export interface NumberManagementSettings {
  licensePlateText?: string;
  logoMarkImageUrl?: string;      // Data URL for the image
  originalNumberImageUrl?: string; // Data URL for the image
}

export type CarPhotoAngle = 'front' | 'side' | 'rear' | 'front_angled_7_3' | 'rear_angled_7_3';

// MyGarage API から取得する愛車情報
export interface CarInfo {
  car_id: string;
  car_brand_n: string;  // 日本語ブランド名
  car_brand_en: string; // 英語ブランド名
  car_model_n: string;  // 日本語モデル名
  car_model_en: string; // 英語モデル名
  car_period_s: string; // 開始期間
  car_period_e: string; // 終了期間
  car_nickname: string | null; // ニックネーム
  car_image_url: string; // 車両画像URL
}

export interface CarReferencePhoto {
  viewAngle: CarPhotoAngle;
  label: string; // User-facing label e.g., "フロント正面"
  imageUrl?: string; // Data URL for the image
}

export interface ReferenceRegistrationSettings {
  favoriteCarName?: string;
  carPhotos: CarReferencePhoto[]; // Should always contain 5 items, one for each angle
}

export interface PersonalUserSettings {
  numberManagement: NumberManagementSettings;
  referenceRegistration: ReferenceRegistrationSettings;
}
// --- END: Personal Settings Types ---

// --- START: Car Settings API Types ---
export interface CarSettings {
  id: number;
  user_id: string;
  car_id: string;
  license_plate_text?: string | null;
  logo_mark_image_url?: string | null;
  original_number_image_url?: string | null;
  car_name?: string | null;
  car_photo_front_url?: string | null;
  car_photo_side_url?: string | null;
  car_photo_rear_url?: string | null;
  car_photo_diagonal_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarSettingsCreateUpdateRequest {
  user_id: string;
  car_id: string;
  license_plate_text?: string;
  logo_mark_image?: File;
  original_number_image?: File;
  car_name?: string;
  car_photo_front?: File;
  car_photo_side?: File;
  car_photo_rear?: File;
  car_photo_diagonal?: File;
  // 削除フラグ
  delete_logo_mark_image?: boolean;
  delete_original_number_image?: boolean;
  delete_car_photo_front?: boolean;
  delete_car_photo_side?: boolean;
  delete_car_photo_rear?: boolean;
  delete_car_photo_diagonal?: boolean;
}

export interface CarSettingsApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: any;
}
// --- END: Car Settings API Types ---


export class RateLimitError extends Error {
  title: string;
  details: string;
  constructor(title: string, details: string) {
    super(details); 
    this.name = "RateLimitError";
    this.title = title;
    this.details = details;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

// コメント関連の型定義
export interface Comment {
  id: string;
  library_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}
