import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // GitHub Pages 部署在子路径下，资源路径需带上仓库名前缀
  // 仅影响构建产物（npm run build），不影响本地开发（npm run dev）
  base: '/json-management-control/',
  plugins: [vue()]
})
