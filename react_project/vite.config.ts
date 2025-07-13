import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.AISHA_API_BASE': JSON.stringify(env.AISHA_API_BASE),
      'process.env.MOCK_API_BASE': JSON.stringify(env.MOCK_API_BASE),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      host: '0.0.0.0', // Docker外からアクセス可能に
      port: 5173, // 明示しておく（環境変数と合わせても可）
      strictPort: true, // ポート使用不可時に代替ポートを使わない
      watch: {
        usePolling: true, // Mac/WSL環境での変更検知安定化（任意）
        interval: 1000, // ポーリング間隔を1秒に設定
      },
    },
  };
});
