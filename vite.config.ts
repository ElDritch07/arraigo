import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Rutas relativas: la app funciona en cualquier subcarpeta (por ejemplo GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss()],
  // Permite abrir la vista previa desde un túnel público.
  preview: { allowedHosts: true },
  // MapLibre carga su worker con import.meta.url; el prebundle de Vite lo rompe.
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
