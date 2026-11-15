import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const base=process.env.APP_BASE_PATH??'/';
if(!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))throw new Error('APP_BASE_PATH must be a slash-delimited public path.');
export default defineConfig({ base,plugins: [react()], build: { target: 'es2022' } });
