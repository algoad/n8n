import { resolve } from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

const cwd = process.cwd();

export default defineConfig({
	plugins: [
		vue(),
		dts({
			rollupTypes: true,
			tsconfigPath: resolve(cwd, 'tsconfig.frontend.json'),
		}),
	],
	build: {
		emptyOutDir: false,
		outDir: resolve(cwd, 'dist', 'frontend'),
		lib: {
			entry: resolve(cwd, 'src', 'frontend', 'index.ts'),
			name: 'n8nFrontEndSdk',
			fileName: 'index',
		},
		rollupOptions: {
			external: ['vue', '@n8n/extension-sdk/frontend'],
			output: {
				preserveModules: false,
				globals: {
					vue: 'Vue',
				},
			},
		},
	},
});
