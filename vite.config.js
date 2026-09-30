import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = Number(env.API_PORT || 5174)

  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_PORT || 5173),
      // The app calls /api/* relatively, so only dev needs to know where the
      // mail server lives. On Vercel these are serverless functions on the
      // same origin and no proxy is involved.
      proxy: { '/api': `http://localhost:${apiPort}` },
    },
  }
})
