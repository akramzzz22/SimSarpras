# Sistem Manajemen Aset Sekolah (Sarpras & Proli)

Full project — hasil scaffolding resmi (`nuxi init` untuk frontend, skeleton resmi
`laravel/laravel` 12.x untuk backend) yang sudah dilengkapi seluruh kustomisasi sesuai
dokumen perencanaan arsitektur.

```
full-project/
├── frontend/   # Nuxt 4 — node_modules SUDAH terinstall, siap `npm run dev`
└── backend/    # Laravel 12 — source code lengkap, vendor/ BELUM terinstall (lihat catatan)
```

## Frontend (Nuxt 4)

Sudah terinstall penuh (node_modules ada), tinggal jalankan:

```bash
cd frontend
npm run dev
```

Stack: Nuxt 4, Vue 3, TypeScript, Pinia, VueUse, TailwindCSS v4 (via `@tailwindcss/vite`),
Vue Query, dan pondasi Shadcn Vue (radix-vue, class-variance-authority, clsx, tailwind-merge,
lucide-vue-next) sudah terpasang di `package.json`.

Struktur `app/` sudah berisi layouts (admin/mobile/staff), middleware per role, Pinia auth
store, service API (Sanctum-ready), types, dan halaman untuk seluruh menu tiap role (Admin,
Ketua Proli, Staff Sarpras, Guru, Murid, Kepala Sekolah) sesuai dokumen.

## Backend (Laravel 12)

Source code lengkap: models, controllers, migrations (barang, laporan kerusakan,
peminjaman, maintenance, vendor, master data), routes/api.php, config Sanctum & Spatie
Permission, RolePermissionSeeder.

> **Catatan penting:** sandbox tempat saya membuat file ini hanya bisa mengakses domain
> terbatas (tanpa `packagist.org`), sehingga folder `vendor/` (dependency PHP) tidak bisa
> saya install di sini. Jalankan perintah berikut di komputer Anda untuk melengkapinya:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# sesuaikan DB_* di .env, lalu:
php artisan migrate --seed
php artisan serve
```

Setelah seed, akun admin default: `admin@example.com` (password di-generate factory,
ubah lewat tinker/db seeder sesuai kebutuhan sebelum produksi).

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

Pola API-first: Nuxt 4 sebagai client (SPA/PWA), Laravel 12 murni sebagai REST API,
autentikasi Sanctum, role & permission via Spatie. Frontend mengakses API lewat
`services/api/*` composables agar logika bisnis tetap di backend.
