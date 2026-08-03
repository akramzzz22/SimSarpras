import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

// ============================================================
// TOGGLE HTTPS:
//   NUXT_HTTPS=false (atau 0)  → dev server HTTP polos
//   NUXT_HTTPS=true (default)  → dev server HTTPS (self-signed)
//
// Kenapa HTTPS default? Browser hanya mengizinkan akses kamera
// (getUserMedia untuk scan QR) di "secure context". HTTPS membuat
// kamera tetap berfungsi saat dibuka dari HP via IP LAN
// (https://192.168.0.2:3000), bukan cuma http://localhost.
// ============================================================
const useHttps = process.env.NUXT_HTTPS !== 'false' && process.env.NUXT_HTTPS !== '0'
const scheme = useHttps ? 'https' : 'http'
const host = '192.168.0.2'

// Sertifikat self-signed untuk development (SAN: localhost, 127.0.0.1, IP LAN).
// Hanya dibaca saat HTTPS aktif agar tidak error kalau folder certs/ tidak ada.
const https = useHttps
  ? {
      key: fileURLToPath(new URL('./certs/dev.key', import.meta.url)),
      cert: fileURLToPath(new URL('./certs/dev.crt', import.meta.url))
    }
  : false

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt'
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()]
  },

  // HTTPS di dev server → kamera (getUserMedia) bisa dipakai dari HP via IP LAN.
  // listhen menerima path file (bukan Buffer) untuk key/cert.
  devServer: {
    https
  },

  // Proxy /api ke backend Laravel di origin yang sama (tidak ada mixed-content,
  // dan tidak perlu CORS). Berlaku untuk mode HTTP maupun HTTPS.
  routeRules: {
    '/api/**': { proxy: 'http://localhost:8000/api/**' }
  },

  // Pendekatan Responsive + PWA: satu codebase untuk
  // Admin/Staff Sarpras/Ketua Proli (desktop & mobile)
  // dan Guru/Murid/Kepala Sekolah (mobile-first)
  app: {
    head: {
      title: 'Sistem Manajemen Aset Sekolah'
    }
  },

  runtimeConfig: {
    public: {
      // Relatif → diproxy Nitro ke backend, aman dari mixed-content saat HTTPS.
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      // Base URL aplikasi, dipakai untuk membuat link pada QR code.
      // Ikut berubah sesuai mode HTTPS agar link di QR tetap valid.
      appBase: process.env.NUXT_PUBLIC_APP_BASE || `${scheme}://${host}:3000`
    }
  },

  typescript: {
    strict: true
  }
})
