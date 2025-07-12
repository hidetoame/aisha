import {
  AspectRatio,
  AdminGenerationMenuCategoryItem,
  AdminGenerationMenuItem,
  GenerationOptions,
  SuzuriItem,
} from './types';

export const APP_NAME = 'マイガレージ - AISHA';
export const GEMINI_IMAGE_MODEL = 'imagen-3.0-generate-002';
export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash-preview-04-17';

export const AVAILABLE_ASPECT_RATIOS: AspectRatio[] = [
  AspectRatio.Square_1_1,
  AspectRatio.Landscape_16_9,
  AspectRatio.Portrait_9_16,
  AspectRatio.Landscape_4_3,
  AspectRatio.Portrait_3_4,
];

export const SNS_OPTIONS = [
  {
    name: 'X',
    urlPrefix: 'https://twitter.com/intent/tweet?text=',
    icon: 'XIcon',
  },
  {
    name: 'Facebook',
    urlPrefix: 'https://www.facebook.com/sharer/sharer.php?u=',
    icon: 'FacebookIcon',
  },
  { name: 'Instagram', icon: 'InstagramIcon' }, // No direct web intent for sharing image+text
  { name: 'Copy URL', icon: 'LinkIcon' }, // For copying share page URL
];

export const GOODS_OPTIONS: SuzuriItem[] = [
  {
    id: 'tshirt_XYZ',
    name: 'Tシャツ',
    creditCost: 50,
    apiId: 'tshirt_XYZ',
    variations: [
      { id: 'size', typeName: 'サイズ', options: ['S', 'M', 'L', 'XL'] },
      { id: 'color', typeName: '色', options: ['白', '黒', '赤', '青'] },
    ],
  },
  {
    id: 'sticker_ABC',
    name: 'ステッカー',
    creditCost: 25,
    apiId: 'sticker_ABC',
    variations: [
      {
        id: 'material',
        typeName: '素材',
        options: ['通常', '防水', 'ホログラム'],
      },
    ],
  },
  {
    id: 'mug_DEF',
    name: 'マグカップ',
    creditCost: 40,
    apiId: 'mug_DEF',
    variations: [
      { id: 'capacity', typeName: '容量', options: ['250ml', '350ml'] },
    ],
  },
];

export const DEFAULT_ASPECT_RATIO = AspectRatio.Square_1_1;
export const EXTEND_IMAGE_CREDIT_COST = 10;

export const USER_VIEW_CATEGORIES: AdminGenerationMenuCategoryItem[] = [
  {
    id: 'cat_model',
    name: 'モデル作成',
    description: '特定のスタイルで車両モデルを生成します。',
  },
  {
    id: 'cat_illustration',
    name: 'イラスト',
    description: '様々なイラストタッチで車両を表現します。',
  },
  {
    id: 'cat_customize',
    name: 'カスタマイズ',
    description: '車両の特定の部分を変更します。',
  },
  {
    id: 'cat_scene',
    name: 'シーン変更',
    description: '車両を様々なシーンに配置します。',
  },
  {
    id: 'cat_camera',
    name: 'カメラ位置変更',
    description: '車両の視点を変更します。',
  },
];

export const USER_VIEW_MENUS: AdminGenerationMenuItem[] = [
  // モデル作成
  {
    id: 'menu_model_tomica',
    categoryId: 'cat_model',
    menuName: 'トミカ風',
    simpleDescription: 'あなたの愛車をトミカ風のミニカースタイルで生成します。',
    generationEngine: 'Imagen3',
    generationPrompt: 'トミカ風のミニカースタイル、白い背景、ミニチュアカー。',
    creditCost: 10,
    userInputFields: [],
    sampleSourceImageUrl: 'https://picsum.photos/seed/tomica_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/tomica_generated_2/300/200',
  },
  {
    id: 'menu_model_choroq',
    categoryId: 'cat_model',
    menuName: 'チョロQ風',
    simpleDescription:
      'あなたの愛車をデフォルメされたチョロQスタイルで生成します。',
    generationEngine: 'Imagen3',
    generationPrompt:
      'チョロQ風のデフォルメされたスタイル、プルバックゼンマイが見える。',
    creditCost: 10,
    userInputFields: [],
    sampleSourceImageUrl: 'https://picsum.photos/seed/choroq_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/choroq_generated_2/300/200',
  },
  // イラスト
  {
    id: 'menu_illust_anime',
    categoryId: 'cat_illustration',
    menuName: 'アニメ風',
    simpleDescription: 'あなたの愛車を鮮やかなアニメ風イラストに変換します。',
    generationEngine: 'Imagen3',
    generationPrompt:
      '日本のアニメ風スタイル、鮮やかな色彩、ダイナミックなアングル。',
    creditCost: 10,
    userInputFields: [],
    sampleSourceImageUrl: 'https://picsum.photos/seed/anime_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/anime_generated_2/300/200',
  },
  {
    id: 'menu_illust_cartoon',
    categoryId: 'cat_illustration',
    menuName: 'カートゥーン風',
    simpleDescription: 'あなたの愛車をポップなカートゥーンスタイルで描きます。',
    generationEngine: 'Imagen3',
    generationPrompt:
      'アメリカンカートゥーンスタイル、太い輪郭線、ポップな色彩。',
    creditCost: 10,
    userInputFields: [],
    sampleSourceImageUrl: 'https://picsum.photos/seed/cartoon_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/cartoon_generated_2/300/200',
  },
  {
    id: 'menu_illust_handdrawn',
    categoryId: 'cat_illustration',
    menuName: '手書き風',
    simpleDescription:
      'あなたの愛車を温かみのある手書き風スケッチで表現します。',
    generationEngine: 'Imagen3',
    generationPrompt:
      '温かみのある手書き風スケッチ、鉛筆画または水彩画タッチ。',
    creditCost: 10,
    userInputFields: [],
    sampleSourceImageUrl:
      'https://picsum.photos/seed/handdrawn_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/handdrawn_generated_2/300/200',
  },
  // カスタマイズ
  {
    id: 'menu_customize_bodycolor',
    categoryId: 'cat_customize',
    menuName: 'ボディ色変更',
    simpleDescription: '車両のボディカラーを指定した色に変更します。',
    generationEngine: 'Imagen3',
    generationPrompt: 'ボディカラーを{{target_color}}に変更。',
    creditCost: 12,
    userInputFields: [
      { placeholderName: 'target_color', fieldLabel: '色名', type: 'text' },
    ],
    sampleSourceImageUrl:
      'https://picsum.photos/seed/bodycolor_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/bodycolor_generated_2/300/200',
  },
  {
    id: 'menu_customize_wheelcolor',
    categoryId: 'cat_customize',
    menuName: 'ホイール色変更',
    simpleDescription: '車両のホイールカラーを指定した色に変更します。',
    generationEngine: 'Imagen3',
    generationPrompt: 'ホイールカラーを{{target_color}}に変更。',
    creditCost: 12,
    userInputFields: [
      { placeholderName: 'target_color', fieldLabel: '色名', type: 'text' },
    ],
    sampleSourceImageUrl:
      'https://picsum.photos/seed/wheelcolor_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/wheelcolor_generated_2/300/200',
  },
  // シーン変更
  {
    id: 'menu_scene_studio',
    categoryId: 'cat_scene',
    menuName: 'スタジオ',
    simpleDescription: 'プロのスタジオで撮影されたような車両画像を生成します。',
    generationEngine: 'Imagen3',
    generationPrompt:
      'プロのスタジオで撮影されたシーン。壁の色は{{wall_color}}、床の色は{{floor_color}}。',
    creditCost: 15,
    userInputFields: [
      { placeholderName: 'wall_color', fieldLabel: '壁色', type: 'text' },
      { placeholderName: 'floor_color', fieldLabel: '床色', type: 'text' },
    ],
    sampleSourceImageUrl: 'https://picsum.photos/seed/studio_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/studio_generated_2/300/200',
  },
  {
    id: 'menu_scene_seaparking',
    categoryId: 'cat_scene',
    menuName: '海の見える駐車場',
    simpleDescription: '海の見える駐車場に車両を配置したシーンを生成します。',
    generationEngine: 'Imagen3',
    generationPrompt: '海の見える駐車場に停車しているシーン。',
    creditCost: 15,
    userInputFields: [],
    sampleSourceImageUrl:
      'https://picsum.photos/seed/seaparking_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/seaparking_generated_2/300/200',
  },
  {
    id: 'menu_scene_highway',
    categoryId: 'cat_scene',
    menuName: '高速走行',
    simpleDescription: '高速道路を走行する車両のシーンを生成します。',
    generationEngine: 'Imagen3',
    generationPrompt:
      '高速道路を走行中のシーン。天気と時間帯は{{weather_time}}、背景は{{background_details}}。',
    creditCost: 15,
    userInputFields: [
      {
        placeholderName: 'weather_time',
        fieldLabel: '天気と時間帯',
        type: 'text',
      },
      {
        placeholderName: 'background_details',
        fieldLabel: '背景',
        type: 'text',
      },
    ],
    sampleSourceImageUrl: 'https://picsum.photos/seed/highway_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/highway_generated_2/300/200',
  },
  // カメラ位置変更
  {
    id: 'menu_camera_top',
    categoryId: 'cat_camera',
    menuName: '上',
    simpleDescription: '車両を真上から見た俯瞰ショットを生成します。',
    generationEngine: 'Imagen3',
    generationPrompt: '真上から見た俯瞰ショット。',
    creditCost: 8,
    userInputFields: [],
    sampleSourceImageUrl:
      'https://picsum.photos/seed/camera_top_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/camera_top_generated_2/300/200',
  },
  {
    id: 'menu_camera_left',
    categoryId: 'cat_camera',
    menuName: '左',
    simpleDescription: '車両を左側面から見たショットを生成します。',
    generationEngine: 'Imagen3',
    generationPrompt: '左側面から見たショット。',
    creditCost: 8,
    userInputFields: [],
    sampleSourceImageUrl:
      'https://picsum.photos/seed/camera_left_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/camera_left_generated_2/300/200',
  },
  {
    id: 'menu_camera_right',
    categoryId: 'cat_camera',
    menuName: '右',
    simpleDescription: '車両を右側面から見たショットを生成します。',
    generationEngine: 'Imagen3',
    generationPrompt: '右側面から見たショット。',
    creditCost: 8,
    userInputFields: [],
    sampleSourceImageUrl:
      'https://picsum.photos/seed/camera_right_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/camera_right_generated_2/300/200',
  },
  {
    id: 'menu_camera_bottom',
    categoryId: 'cat_camera',
    menuName: '下',
    simpleDescription: '車両を下から見上げたローアングルショットを生成します。',
    generationEngine: 'Imagen3',
    generationPrompt: '下から見上げたローアングルショット。',
    creditCost: 8,
    userInputFields: [],
    sampleSourceImageUrl:
      'https://picsum.photos/seed/camera_bottom_source_2/300/200',
    sampleGeneratedImageUrl:
      'https://picsum.photos/seed/camera_bottom_generated_2/300/200',
  },
];

export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  userInputValues: {},
  finalPromptForService: '',
  generationEngineForService: 'Imagen3',
  creditCostForService: 10,
  aspectRatio: DEFAULT_ASPECT_RATIO,
  additionalInput: '',
  uploadedCarImageFile: null,
  uploadedCarImageDataUrl: null,
};
