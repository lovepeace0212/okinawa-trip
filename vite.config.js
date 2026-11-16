import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 這是告訴 Vercel 如何正確打包 React 程式碼的設定檔
export default defineConfig({
  plugins: [react()],
})
