import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import cesium from 'vite-plugin-cesium';

export default defineConfig({
  plugins: [cesium(), vue()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html', // 默认入口
        comp: 'Comp.html', // 新的入口
      },
    },
  },
});