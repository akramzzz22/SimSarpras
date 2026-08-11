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

  // Auto-import komponen memakai NAMA FILE saja (tanpa prefix folder),
  // sehingga struktur folder bebas diatur (ui/, navigation/, qr/, widgets/)
  // tanpa mengubah pemakaian <Pagination>, <ThemeSwitcher>, dsb.
  components: [
    { path: '~/components', pathPrefix: false }
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

  // API ditangani langsung oleh Nuxt/Nitro (server/api/*) — tidak ada backend
  // terpisah. File upload disimpan di public/storage/** dan dilayani Nitro
  // sebagai aset statis pada path /storage/**. URL relatif di database (mis.
  // /storage/uploads/xxx.png) tetap berfungsi tanpa mixed-content.

  // Pendekatan Responsive + PWA: satu codebase untuk
  // Admin/Staff Sarpras/Ketua Proli (desktop & mobile)
  // dan Guru/Murid/Kepala Sekolah (mobile-first)
  app: {
    head: {
      title: 'Sistem Manajemen Aset Sekolah',
      // Favicon: logo SVG Aplikasi Sarpras
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/images/logo-sarpras.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Open+Sans:wght@400;500;600;700&display=swap'
        }
      ]
    }
  },

  runtimeConfig: {
    public: {
      // Relatif → diproxy Nitro ke server API, aman dari mixed-content saat HTTPS.
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
