# Sistem Manajemen Aset Sekolah (Sarpras & Proli)

Aplikasi manajemen aset, peminjaman, dan maintenance sekolah berbasis **Nuxt 4** — frontend dan API (Nitro `server/api/*`) dalam satu codebase, dengan PostgreSQL sebagai database.

```
full-project/
└── frontend/   # Nuxt 4 — UI + REST API (server/api) + koneksi PostgreSQL
```

## Menjalankan Aplikasi

```bash
cd frontend
npm install
cp .env.example .env   # sesuaikan koneksi database
npm run dev
```

Server dev berjalan di `https://192.168.0.2:3000` (HTTPS default agar kamera scan QR berfungsi dari HP via IP LAN). Set `NUXT_HTTPS=false` untuk HTTP polos.

## Persyaratan

- Node.js 20+
- PostgreSQL (database `sarpras`).

## Stack

Nuxt 4, Vue 3, TypeScript, Pinia, VueUse, TailwindCSS v4, Vue Query, Nitro server (`server/api/*`), PostgreSQL (`pg`), bcryptjs untuk autentikasi.

## Role & Device

| Role | Device |
|---|---|
| Admin | Desktop/Web |
| Staff Sarpras | Desktop & Mobile |
| Ketua Proli | Desktop & Mobile |
| Guru | Mobile |
| Murid | Mobile |
| Kepala Sekolah | Mobile |

## Arsitektur

Nuxt 4 sebagai fullstack: halaman di `app/`, REST API di `server/api/*` (ditangani langsung Nitro, tidak ada backend terpisah). Autentikasi token kompatibel Sanctum (`personal_access_tokens`), role & permission via tabel Spatie (`roles`, `model_has_roles`). Frontend mengakses API lewat `app/services/api/*` dengan base URL relatif `/api`.
