import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // テストの中で localStorage などブラウザの機能を使えるようにする
    environment: 'jsdom',
  },
})
