// ============================================================
// SERVICE ADMIN — aggregator modul API.
//
// Sebelumnya satu file 418 baris; kini dipecah agar mudah dipahami:
//   types.ts               → semua interface data API
//   modules/asset.ts       → upload, barang, barangJadwal, mutasi
//   modules/peminjaman.ts  → peminjaman
//   modules/maintenance.ts → laporan kerusakan, maintenance, vendor
//   modules/master.ts      → master data generik (CRUD)
//   modules/akun.ts        → generate/lihat/reset password user
//   modules/pengaturan.ts  → roles, permissions, pageSettings, sistem, tahunAjaran, activityLogs
//   modules/notifikasi.ts  → notifikasi
//
// ANTARMUKA useAdminService() TIDAK BERUBAH — semua halaman yang
// memakai `admin.barang.list(...)`, `admin.peminjaman.approve(...)`,
// dsb. tetap berfungsi. Type & HARI_LABEL di-re-export agar import
// lama ('~/services/api/admin') tetap valid.
// ============================================================
export * from './types'

export { useAssetApi } from './modules/asset'
export { usePeminjamanApi } from './modules/peminjaman'
export { useMaintenanceApi } from './modules/maintenance'
export { useMasterApi } from './modules/master'
export { useAkunApi } from './modules/akun'
export { usePengaturanApi } from './modules/pengaturan'
export { useNotifikasiApi } from './modules/notifikasi'

import { useApiClient } from './client'
import { useAssetApi } from './modules/asset'
import { usePeminjamanApi } from './modules/peminjaman'
import { useMaintenanceApi } from './modules/maintenance'
import { useMasterApi } from './modules/master'
import { useAkunApi } from './modules/akun'
import { usePengaturanApi } from './modules/pengaturan'
import { useNotifikasiApi } from './modules/notifikasi'

export function useAdminService() {
  const api = useApiClient()

  return {
    ...useAssetApi(api),
    ...usePeminjamanApi(api),
    ...useMaintenanceApi(api),
    ...useMasterApi(api),
    ...useAkunApi(api),
    ...usePengaturanApi(api),
    ...useNotifikasiApi(api)
  }
}

/** Tipe lengkap objek yang dikembalikan useAdminService(). */
export type AdminService = ReturnType<typeof useAdminService>
