/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el build funciona en cualquier hosting estático (Vercel, Netlify, GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss()],
  // Leaflet + Recharts + zod ≈ 300 KB gzip: aceptable para un dashboard.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'node',
  },
})
