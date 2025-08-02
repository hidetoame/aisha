import React, { useState, useCallback } from 'react';
import { XMarkIcon, UploadIcon } from '@/components/icons/HeroIcons';
import { AdminGenerationMenuCategoryItem, AdminGenerationMenuItem } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GenerationMenuAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: number | null;
  categories: AdminGenerationMenuCategoryItem[];
  onApply: (data: {
    description: string;
    prompt: string;
    promptVariables: Array<{ key: string; label: string }>;
  }) => void;
}

interface AnalysisResult {
  subject: string;
  scene: string;
}

interface GeneratedMenu {
  description: string;
  userInputFields: string;
  prompt: string;
}

type Step = 'upload' | 'analyzing' | 'edit-analysis' | 'generating' | 'edit-menu';

const GenerationMenuAssistantModal: React.FC<GenerationMenuAssistantModalProps> = ({
  isOpen,
  onClose,
  categoryId,
  categories,
  onApply,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult>({
    subject: '',
    scene: '',
  });
  const [generatedMenu, setGeneratedMenu] = useState<GeneratedMenu>({
    description: '',
    userInputFields: '',
    prompt: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const selectedCategory = categories.find(cat => cat.id === categoryId);
  const categoryName = selectedCategory?.name || 'イラスト作成';

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      analyzeImage(file);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      analyzeImage(file);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const analyzeImage = async (file: File) => {
    setStep('analyzing');
    setIsProcessing(true);
    setError('');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is not configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const prompt = `
これから、アップした画像を参考に、画像生成用のプロンプトを作成してもらいます。

画像が「${categoryName}」によって生成した場合の、期待する画像となります。

まず、画像を分析してください。
画像には必ず、車 が被写体として存在します。 被写体の車は1台です。
※もし、車が、複数写っている場合は、メインの車以外は背景やシーンとして考えてください
※もし、車の周りにカメラと向き合っている 人 が存在する場合は、人もセットで被写体と考えてください

分析の際には、画像を、被写体　と　シーン（描写、構図、スタイル含む）　をそれぞれわけて捉えてください。
理由は、被写体のみを　入れ替えることができる　プロンプトを作るためです。

シーンの分析には以下も含めてください：
- イラストの場合：書き方、タッチ、線の使い方、色使い、影の付け方、アートスタイル等
- 写真の場合：ボケ感（被写界深度）、レンズの種類（広角、望遠等）、撮影手法、照明、フィルム感等
- 被写体への向き合い方：アングル、構図、被写体の配置、視点の高さ、距離感等
- 全体的な表現手法：リアリスティック、スタイライズド、ミニマリスティック等

分析結果を わけて、出力してください。
シーンには被写体の特徴は一切含めずに、「被写体」として登場させてください。
例）「被写体」がスタジオ照明に照らされ、床には「被写体」の一部が写りこんでいる。

分析結果は　日本語でお願いします。

以下のJSON形式で出力してください：
{
  "subject": "被写体の詳細な説明",
  "scene": "シーン（描写、構図、スタイル含む）の詳細な説明"
}
`;

      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: file.type,
            data: base64Data,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisData = JSON.parse(jsonMatch[0]);
        setAnalysisResult(analysisData);
        setStep('edit-analysis');
      } else {
        throw new Error('Failed to parse analysis result');
      }
    } catch (err) {
      console.error('Image analysis error:', err);
      setError('画像の解析に失敗しました。もう一度お試しください。');
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateMenu = async () => {
    setStep('generating');
    setIsProcessing(true);
    setError('');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is not configured');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      
      // First request: Generate user input fields from scene info
      const model1 = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt1 = `
シーン情報: ${analysisResult.scene}
被写体情報: ${analysisResult.subject}

上記のシーン情報を参考に、ユーザーが変更可能な要素を列挙してください。
ただし、以下の条件に従ってください：

1. シーンから抽出できる変更可能な要素（天候、時間帯、背景の詳細、照明など）
2. 被写体情報に人物が含まれている場合は「人物の服装」「人物のポーズ」なども追加
3. 車自体の特徴（色、車種など）は含めない
4. 実際にシーンに存在する要素のみ列挙する

ない場合は「無し」と出力してください。
カンマ区切りで出力してください。
`;

      const result1 = await model1.generateContent(prompt1);
      const response1 = await result1.response;
      const userInputFields = response1.text().trim();

      // Second request: Generate description and prompt from scene info only
      const model2 = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const prompt2 = `
シーン: ${analysisResult.scene}

上記のシーン情報のみを使用して、以下の項目を作成してください：

1. 簡易説明
   - シーンを要約した内容
   - シーンの中の「被写体」は「愛車」に置き換えて生成
   - 30文字程度で簡潔に

2. 生成プロンプト
   - シーンを生成するための英語プロンプト
   - 車は "car", "vehicle", "automobile" などの一般的な表現のみを使用
   - シーンの描写（場所、照明、構図、雰囲気など）に焦点を当てる
   - 高品質な画像生成に適した詳細なプロンプト

以下のJSON形式で出力してください：
{
  "description": "簡易説明",
  "prompt": "英語の生成プロンプト"
}
`;

      const result2 = await model2.generateContent(prompt2);
      const response2 = await result2.response;
      const text2 = response2.text();
      
      // Extract JSON from the response
      const jsonMatch = text2.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const menuData = JSON.parse(jsonMatch[0]);
        setGeneratedMenu({
          description: menuData.description,
          userInputFields: userInputFields,
          prompt: menuData.prompt
        });
        setStep('edit-menu');
      } else {
        throw new Error('Failed to parse menu generation result');
      }
    } catch (err) {
      console.error('Menu generation error:', err);
      setError('メニュー生成に失敗しました。もう一度お試しください。');
      setStep('edit-analysis');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    // Parse user input fields
    const promptVariables: Array<{ key: string; label: string }> = [];
    
    if (generatedMenu.userInputFields && generatedMenu.userInputFields !== '無し') {
      const fields = generatedMenu.userInputFields.split(/[,、]/);
      fields.forEach((field, index) => {
        const trimmedField = field.trim();
        if (trimmedField) {
          // Generate a key from the field name
          const key = `user_input_${index + 1}`;
          promptVariables.push({
            key,
            label: trimmedField,
          });
        }
      });
    }

    // Add instruction to preserve uploaded car features
    const finalPrompt = generatedMenu.prompt + " The uploaded car's features, color, and design must remain completely unchanged.";

    onApply({
      description: generatedMenu.description,
      prompt: finalPrompt,
      promptVariables,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 px-6 py-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">生成メニュー アシスタント</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
              {error}
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-2">STEP.1 画像をアップロード</h3>
              <p className="text-gray-400 text-sm mb-4">
                参考にする画像をアップロードしてください。アップロード後、自動的に解析が始まります。
              </p>
              
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer"
              >
                <UploadIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">
                  ドラッグ＆ドロップ または クリックしてファイルを選択
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  ファイルを選択
                </label>
              </div>
            </div>
          )}

          {/* Step 2: Analyzing */}
          {step === 'analyzing' && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-white mb-4">STEP.2 GEMINI AI が画像を解析中...</h3>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">カテゴリ: {categoryName}</p>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Analyzing"
                  className="mt-4 mx-auto max-w-sm rounded-lg shadow-lg"
                />
              )}
            </div>
          )}

          {/* Step 2.5: Edit Analysis */}
          {step === 'edit-analysis' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">STEP.2 画像解析結果</h3>
              <p className="text-gray-400 text-sm mb-4">
                解析結果を確認・編集してください。編集後、「メニュー生成」ボタンを押してください。
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    被写体
                  </label>
                  <textarea
                    value={analysisResult.subject}
                    onChange={(e) => setAnalysisResult(prev => ({ ...prev, subject: e.target.value }))}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    シーン（描写、構図含む）
                  </label>
                  <textarea
                    value={analysisResult.scene}
                    onChange={(e) => setAnalysisResult(prev => ({ ...prev, scene: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={generateMenu}
                  disabled={!analysisResult.subject || !analysisResult.scene}
                  className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  メニュー生成
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Generating */}
          {step === 'generating' && (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-white mb-4">STEP.3 メニュー項目を生成中...</h3>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
              <p className="text-gray-400">解析結果を元にメニュー項目を生成しています</p>
            </div>
          )}

          {/* Step 3.5: Edit Menu */}
          {step === 'edit-menu' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">STEP.3 生成されたメニュー項目</h3>
              <p className="text-gray-400 text-sm mb-4">
                生成された内容を確認・編集してください。編集後、「メニューに反映」ボタンを押してください。
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    簡易説明
                  </label>
                  <textarea
                    value={generatedMenu.description}
                    onChange={(e) => setGeneratedMenu(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    ユーザー追加入力項目設定
                  </label>
                  <input
                    type="text"
                    value={generatedMenu.userInputFields}
                    onChange={(e) => setGeneratedMenu(prev => ({ ...prev, userInputFields: e.target.value }))}
                    placeholder="例: 人物の服装, 天候, 時間帯 （ない場合は「無し」）"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    生成プロンプト（英語）
                  </label>
                  <textarea
                    value={generatedMenu.prompt}
                    onChange={(e) => setGeneratedMenu(prev => ({ ...prev, prompt: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleApply}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    メニューに反映
                  </button>
                  <button
                    onClick={() => setStep('edit-analysis')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    戻る
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerationMenuAssistantModal;