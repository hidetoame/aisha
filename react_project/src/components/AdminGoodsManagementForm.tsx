import React, { useState } from 'react';
import { GoodsManagementItem } from '../services/api/goods-management';

interface AdminGoodsManagementFormProps {
  item: GoodsManagementItem;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const AdminGoodsManagementForm: React.FC<AdminGoodsManagementFormProps> = ({ 
  item, 
  onSave, 
  onCancel 
}) => {
  const [currentItem, setCurrentItem] = useState<GoodsManagementItem>(item);
  
  // デバッグ用: 説明データを確認
  console.log('AdminGoodsManagementForm - item:', item);
  console.log('AdminGoodsManagementForm - descriptions:', item.descriptions);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setCurrentItem((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      display_name: currentItem.display_name,
      display_order: currentItem.display_order,
      profit_margin: currentItem.profit_margin,
      is_public: currentItem.is_public,
      needs_sub_materials: currentItem.needs_sub_materials,
      item_type: currentItem.item_type,
      api_config: currentItem.api_config,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg space-y-4 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <h4 className="text-lg font-semibold text-indigo-300">
          グッズ管理: {item.display_name}
        </h4>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="display_name" className="text-sm text-gray-400 block mb-1">
              表示名
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              value={currentItem.display_name || ''}
              onChange={handleChange}
              className="w-full bg-gray-700 p-2 rounded text-gray-200"
              required
            />
          </div>

          <div>
            <label htmlFor="display_order" className="text-sm text-gray-400 block mb-1">
              表示順序
            </label>
            <input
              id="display_order"
              name="display_order"
              type="number"
              value={currentItem.display_order || 0}
              onChange={handleChange}
              className="w-full bg-gray-700 p-2 rounded text-gray-200"
            />
          </div>

          <div>
            <label htmlFor="profit_margin" className="text-sm text-gray-400 block mb-1">
              追加利益 (円)
            </label>
            <input
              id="profit_margin"
              name="profit_margin"
              type="number"
              value={currentItem.profit_margin || 0}
              onChange={handleChange}
              className="w-full bg-gray-700 p-2 rounded text-gray-200"
            />
            <p className="text-xs text-gray-500 mt-1">
              基本価格: ¥{item.base_price.toLocaleString()} → 最終価格: ¥{item.final_price.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="is_public"
              name="is_public"
              type="checkbox"
              checked={currentItem.is_public}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="is_public" className="text-sm text-gray-400">
              公開する
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="needs_sub_materials"
              name="needs_sub_materials"
              type="checkbox"
              checked={currentItem.needs_sub_materials}
              onChange={handleChange}
              className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor="needs_sub_materials" className="text-sm text-gray-400">
              sub_materialsが必要
            </label>
          </div>

          <div>
            <label htmlFor="item_type" className="text-sm text-gray-400 block mb-1">
              商品タイプ
            </label>
            <input
              id="item_type"
              name="item_type"
              type="text"
              value={currentItem.item_type || ''}
              onChange={handleChange}
              className="w-full bg-gray-700 p-2 rounded text-gray-200"
              placeholder="例: t-shirt, hoodie, etc."
            />
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h5 className="text-md font-semibold text-indigo-400 mb-2">
              商品情報
            </h5>
            <div className="space-y-2 text-sm text-gray-300">
              <p><span className="text-gray-400">SUZURI ID:</span> {item.suzuri_item_id}</p>
              <p><span className="text-gray-400">アイテム名:</span> {item.item_name}</p>
              <p><span className="text-gray-400">基本価格:</span> ¥{item.base_price.toLocaleString()}</p>
              {item.descriptions && item.descriptions.length > 0 ? (
                <div>
                  <p className="text-gray-400">説明:</p>
                  <ul className="list-disc list-inside ml-2">
                    {item.descriptions.map((desc, index) => (
                      <li key={index} className="text-xs">{desc}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400">説明:</p>
                  <p className="text-xs text-gray-500 ml-2">説明データがありません</p>
                  <p className="text-xs text-gray-600 ml-2">Debug: descriptions = {JSON.stringify(item.descriptions)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h5 className="text-md font-semibold text-indigo-400 mb-2">
              API設定
            </h5>
            <div className="space-y-2 text-sm text-gray-300">
              <div>
                <label className="text-gray-400 block mb-1">API Config (JSON)</label>
                <textarea
                  value={JSON.stringify(currentItem.api_config, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setCurrentItem(prev => ({
                        ...prev,
                        api_config: parsed
                      }));
                    } catch (error) {
                      // JSON解析エラーは無視（編集中のため）
                    }
                  }}
                  className="w-full bg-gray-700 p-2 rounded text-gray-200 text-xs font-mono h-32 resize-none"
                  placeholder="API設定をJSON形式で入力"
                />
              </div>
            </div>
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
              type="submit"
              className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded text-white font-medium"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminGoodsManagementForm; 