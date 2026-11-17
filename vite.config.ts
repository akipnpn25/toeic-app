import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages は https://ユーザー名.github.io/リポジトリ名/ という「サブフォルダ」で公開される。
  // './'（今いる場所からの相対パス）にしておくと、リポジトリ名がどうでも動く。
  base: './',
  test: {
    // テストの中で localStorage などブラウザの機能を使えるようにする
    environment: 'jsdom',
  },
})
