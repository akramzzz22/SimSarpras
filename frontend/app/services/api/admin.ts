import { useApiClient } from './client'

export interface Paginated<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
  from: number | null
  to: number | null
}

// ============ Barang / Asset ============
export interface Barang {
  id: number
  nama: string
  deskripsi?: string | null
  kode_qr: string
  owner_type: 'sarpras' | 'proli'
  proli_id?: number | null
  kategori_id?: number | null
  ruangan_id?: number | null
  status: 'aktif' | 'rusak' | 'dipinjam' | 'maintenance'
  bisa_dipinjam?: boolean
  satuan_id?: number | null
  kondisi_id?: number | null
  sumber_dana_id?: number | null
  proli?: { id: number; nama: string } | null
  kategori?: { id: number; nama: string } | null
  ruangan?: { id: number; nama: string; gedung?: { id: number; nama: string } | null } | null
  satuan?: { id: number; nama: string } | null
  kondisi?: { id: number; nama: string } | null
  sumberDana?: { id: number; nama: string } | null
  laporanKerusakan?: LaporanKerusakan[]
  peminjaman?: Peminjaman[]
  created_at?: string
  updated_at?: string
}

// ============ Murid (data murni, bukan akun login) ============
export interface Murid {
  id: number
  nis: string
  nama: string
  kelas_id?: number | null
  jurusan_id?: number | null
  proli_id?: number | null
  user_id?: number | null
  kelas?: { id: number; nama: string; jurusan?: { id: number; nama: string } | null } | null
  jurusan?: { id: number; nama: string } | null
  proli?: { id: number; nama: string } | null
  user?: { id: number; name: string; email: string | null } | null
  created_at?: string
  updated_at?: string
}

// ============ Hasil generate/lihat/reset akun (email + password sekali pakai) ============
export interface AkunMurid {
  user_id: number
  nama: string
  email: string
  password: string
  generated?: boolean
}

// ============ Master Data ============
export interface MasterItem {
  id: number
  [key: string]: any
}

export interface UserItem extends MasterItem {
  name: string
  email: string | null
  foto?: string | null
  jenis_kelamin?: 'L' | 'P' | null
  is_active?: boolean
  failed_login_count?: number
  roles?: { id: number; name: string }[]
  kelas?: string | null
  jurusan_id?: number | null
  jurusan?: { id: number; nama: string } | null
  murid?: { id: number; nis: string; nama: string } | null
}

// ============ Laporan Kerusakan ============
export interface LaporanKerusakan {
  id: number
  barang_id: number
  pelapor_id: number
  deskripsi: string
  foto_url?: string | null
  status: 'menunggu' | 'diverifikasi' | 'diperbaiki' | 'selesai'
  assigned_to?: number | null
  vendor_id?: number | null
  hasil_perbaikan_url?: string | null
  jenis_kerusakan_id?: number | null
  tingkat_kerusakan_id?: number | null
  barang?: { id: number; nama: string; kode_qr?: string; owner_type?: 'sarpras' | 'proli' } | null
  pelapor?: { id: number; name: string } | null
  assignedStaff?: { id: number; name: string } | null
  vendor?: { id: number; nama: string } | null
  jenisKerusakan?: { id: number; nama: string } | null
  tingkatKerusakan?: { id: number; nama: string } | null
  created_at?: string
}

// ============ Peminjaman ============
export interface Peminjaman {
  id: number
  barang_id: number
  peminjam_id: number
  status: 'menunggu' | 'disetujui' | 'ditolak' | 'dipinjam' | 'dikembalikan'
  tanggal_pinjam?: string
  /** Waktu nyata HH:MM (pola booking), mis. "08:00" */
  jam_mulai?: string | null
  jam_selesai?: string | null
  keperluan?: string | null
  /** Jenis peminjaman: 'pembelajaran' (default) atau 'eskul' (kegiatan ekstrakurikuler) */
  jenis?: 'pembelajaran' | 'eskul'
  /** Penanggung jawab kegiatan, mis. "Divisi Logistik — Andi" */
  penanggung_jawab?: string | null
  /** ID kelompok pengajuan paket (beberapa barang dalam satu pengajuan) */
  kelompok_id?: string | null
  foto_pinjam?: string | null
  foto_kembali?: string | null
  disetujui_oleh?: number | null
  /** true bila status aktif (disetujui/dipinjam) dan tanggal pinjam sudah lewat */
  terlambat?: boolean
  barang?: { id: number; nama: string; kode_qr?: string; kategori?: { id: number; nama: string } | null; ruangan?: { id: number; nama: string } | null } | null
  peminjam?: { id: number; name: string; kelas?: string | null; jurusan?: { id: number; nama: string } | null } | null
  penyetuju?: { id: number; name: string } | null
  /** Anggota kelompok paket (hanya ada pada show() bila kelompok_id terisi) */
  kelompok?: Peminjaman[]
  created_at?: string
}

// ============ Jadwal Booking Barang ============
/**
 * Slot jadwal booking per barang per hari.
 * hari: 1 = Senin ... 7 = Minggu. status 'booked' bisa dihitung otomatis
 * oleh endpoint ketersediaan bila ada peminjaman aktif yang tumpang tindih.
 */
export interface BarangJadwal {
  id: number
  barang_id: number
  hari: number
  jam_mulai: string // "08:00"
  jam_selesai: string
  status: 'available' | 'istirahat' | 'tidak_tersedia' | 'booked'
}

export const HARI_LABEL = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

// ============ Maintenance ============
export interface Maintenance {
  id: number
  barang_id: number
  tanggal_jadwal: string
  staff_id?: number | null
  vendor_id?: number | null
  status: 'terjadwal' | 'berlangsung' | 'selesai'
  dokumentasi_url?: string | null
  catatan?: string | null
  biaya?: number | string | null
  resi_url?: string | null
  jenis_maintenance_id?: number | null
  barang?: { id: number; nama: string } | null
  staff?: { id: number; name: string } | null
  vendor?: { id: number; nama: string } | null
  jenisMaintenance?: { id: number; nama: string } | null
  created_at?: string
  // state UI lokal (bukan dari server API)
  showResi?: boolean
}

// ============ Page Settings (logo & pengaturan global via tabel page_settings) ============
export interface PageSetting {
  id: number
  page_key: string
  page_name: string
  gambar?: string | null
  aturan?: string | null
  batasan?: string | null
}

// ============ Pengaturan Sistem ============
export interface SistemSetting {
  nama_aplikasi: string
  pengumuman: string
  max_hari_pinjam: number
  max_barang_pinjam: number
  jam_mulai: string
  jam_selesai: string
  mode_pemeliharaan: boolean
}

// ============ Tahun Ajaran ============
export interface TahunAjaran {
  id: number
  nama: string
  tanggal_mulai?: string | null
  tanggal_selesai?: string | null
  is_active?: boolean
  semester?: 'ganjil' | 'genap'
  created_at?: string
}

export interface TahunAjaranAktif {
  tahun_ajaran?: { id: number; nama: string } | null
  semester?: 'ganjil' | 'genap'
  label?: string
}

// ============ Mutasi Barang (masuk / keluar / pindah) ============
export interface MutasiBarang {
  id: number
  barang_id: number
  jenis: 'masuk' | 'keluar' | 'pindah'
  tanggal: string
  jumlah: number
  keterangan?: string | null
  ruangan_asal_id?: number | null
  ruangan_tujuan_id?: number | null
  user_id?: number | null
  barang?: { id: number; nama: string; kode_qr?: string } | null
  ruanganAsal?: { id: number; nama: string } | null
  ruanganTujuan?: { id: number; nama: string } | null
  user?: { id: number; name: string } | null
  created_at?: string
}

// ============ Log Aktivitas ============
export interface ActivityLog {
  id: number
  user_id?: number | null
  action: string
  subject_type?: string | null
  subject_id?: number | null
  description?: string | null
  ip_address?: string | null
  created_at?: string
  user?: { id: number; name: string } | null
}

// ============ Permission ============
export interface PermissionItem {
  id: number
  name: string
}

// ============ Notifikasi ============
export interface AppNotification {
  id: string
  data: {
    type?: string
    maintenance_id?: number
    barang?: string
    tanggal_jadwal?: string
    message?: string
  }
  read_at?: string | null
  created_at?: string
}

export function useAdminService() {
  const api = useApiClient()

  return {
    // Upload gambar → URL publik (foto resi, dokumentasi, dsb)
    upload: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api<{ url: string }>('/upload', { method: 'POST', body: form })
    },

    // Notifikasi (staff melihat jadwal maintenance baru)
    notifications: {
      list: () => api<{ data: AppNotification[]; unread_count: number }>('/notifications'),
      markRead: (id: string) => api(`/notifications/${id}/read`, { method: 'POST' }),
      markAllRead: () => api('/notifications/read-all', { method: 'POST' })
    },

    // Fitur akun (generate/lihat/reset password) — halaman Pengaturan Akun
    akun: {
      generate: (id: number) => api<AkunMurid>(`/users/${id}/generate-akun`, { method: 'POST' }),
      resetPassword: (id: number) => api<AkunMurid>(`/users/${id}/reset-password`, { method: 'POST' }),
      lihatPassword: (id: number) => api<AkunMurid>(`/users/${id}/lihat-password`),
      toggleAktif: (id: number) => api<UserItem>(`/users/${id}/toggle-aktif`, { method: 'POST' })
    },

    // Master Data generik (gedung, jurusan, proli, ruangan, kategori-barang, murid, users)
    master: {
      list: <T = MasterItem>(resource: string, params?: Record<string, any>) =>
        api<Paginated<T>>(`/${resource}`, { params }),
      show: <T = MasterItem>(resource: string, id: number) => api<T>(`/${resource}/${id}`),
      create: <T = MasterItem>(resource: string, body: Record<string, any>) =>
        api<T>(`/${resource}`, { method: 'POST', body }),
      update: <T = MasterItem>(resource: string, id: number, body: Record<string, any>) =>
        api<T>(`/${resource}/${id}`, { method: 'PUT', body }),
      remove: (resource: string, id: number) => api(`/${resource}/${id}`, { method: 'DELETE' })
    },

    // Barang
    barang: {
      list: (params?: Record<string, any>) => api<Paginated<Barang>>('/barang', { params }),
      show: (id: number) => api<Barang>(`/barang/${id}`),
      byKode: (kode: string) => api<Barang>(`/barang/by-kode/${encodeURIComponent(kode)}`),
      create: (body: Partial<Barang>) => api<Barang>('/barang', { method: 'POST', body }),
      update: (id: number, body: Partial<Barang>) => api<Barang>(`/barang/${id}`, { method: 'PUT', body }),
      remove: (id: number) => api(`/barang/${id}`, { method: 'DELETE' })
    },

    // Laporan Kerusakan
    laporan: {
      list: (params?: Record<string, any>) => api<Paginated<LaporanKerusakan>>('/laporan-kerusakan', { params }),
      create: (body: Record<string, any>) => api<LaporanKerusakan>('/laporan-kerusakan', { method: 'POST', body }),
      update: (id: number, body: Record<string, any>) =>
        api(`/laporan-kerusakan/${id}`, { method: 'PUT', body }),
      verifikasi: (id: number, body: Record<string, any>) =>
        api(`/laporan-kerusakan/${id}/verifikasi`, { method: 'POST', body })
    },

    // Peminjaman
    peminjaman: {
      list: (params?: Record<string, any>) => api<Paginated<Peminjaman>>('/peminjaman', { params }),
      show: (id: number) => api<Peminjaman>(`/peminjaman/${id}`),
      create: (body: Record<string, any>) => api<Peminjaman[]>('/peminjaman', { method: 'POST', body }),
      approve: (id: number) => api(`/peminjaman/${id}/approve`, { method: 'POST' }),
      reject: (id: number) => api(`/peminjaman/${id}/reject`, { method: 'POST' }),
      kembalikan: (id: number, body?: Record<string, any>) =>
        api(`/peminjaman/${id}/kembalikan`, { method: 'POST', body: body ?? {} })
    },

    // Jadwal Booking Barang
    barangJadwal: {
      list: (params?: Record<string, any>) => api<BarangJadwal[]>('/barang-jadwal', { params }),
      ketersediaan: (barangId: number, tanggal: string) =>
        api<BarangJadwal[]>('/barang-jadwal/ketersediaan', { params: { barang_id: barangId, tanggal } }),
      store: (body: { barang_id: number; slots: Partial<BarangJadwal>[] }) =>
        api<BarangJadwal[]>('/barang-jadwal', { method: 'POST', body }),
      update: (id: number, body: Partial<BarangJadwal>) =>
        api<BarangJadwal>(`/barang-jadwal/${id}`, { method: 'PUT', body }),
      remove: (id: number) => api(`/barang-jadwal/${id}`, { method: 'DELETE' })
    },

    // Roles
    roles: {
      list: () => api<{ id: number; name: string; users_count?: number }[]>('/roles'),
      create: (body: { name: string }) => api('/roles', { method: 'POST', body }),
      remove: (id: number) => api(`/roles/${id}`, { method: 'DELETE' })
    },

    // Permission (halaman Pengaturan → Permission)
    permissions: {
      list: () => api<PermissionItem[]>('/permissions'),
      rolePermissions: (roleId: number) => api<number[]>(`/roles/${roleId}/permissions`),
      syncRolePermissions: (roleId: number, permissionIds: number[]) =>
        api<number[]>(`/roles/${roleId}/permissions`, { method: 'POST', body: { permission_ids: permissionIds } })
    },

    // Mutasi Barang (Barang Masuk / Keluar / Pindah Ruangan)
    mutasi: {
      list: (params?: Record<string, any>) => api<Paginated<MutasiBarang>>('/mutasi-barang', { params }),
      create: (body: Record<string, any>) => api<MutasiBarang>('/mutasi-barang', { method: 'POST', body }),
      remove: (id: number) => api(`/mutasi-barang/${id}`, { method: 'DELETE' })
    },

    // Log Aktivitas (halaman Pengaturan → Log Aktivitas)
    activityLogs: {
      list: (params?: Record<string, any>) => api<Paginated<ActivityLog>>('/activity-logs', { params })
    },

    // Maintenance
    maintenance: {
      list: (params?: Record<string, any>) => api<Paginated<Maintenance>>('/maintenance', { params }),
      show: (id: number) => api<Maintenance>(`/maintenance/${id}`),
      create: (body: Record<string, any>) => api<Maintenance>('/maintenance', { method: 'POST', body }),
      update: (id: number, body: Record<string, any>) => api<Maintenance>(`/maintenance/${id}`, { method: 'PUT', body }),
      remove: (id: number) => api(`/maintenance/${id}`, { method: 'DELETE' })
    },

    // Vendor
    vendor: {
      list: (params?: Record<string, any>) => api<Paginated<any>>('/vendor', { params }),
      create: (body: Record<string, any>) => api('/vendor', { method: 'POST', body }),
      update: (id: number, body: Record<string, any>) => api(`/vendor/${id}`, { method: 'PUT', body }),
      remove: (id: number) => api(`/vendor/${id}`, { method: 'DELETE' })
    },

    // Page Settings (dipakai Logo & Identitas serta Tahun Ajaran)
    pageSettings: {
      list: () => api<PageSetting[]>('/page-settings'),
      create: (body: Record<string, any>) => api<PageSetting>('/page-settings', { method: 'POST', body }),
      update: (id: number, body: Record<string, any>) => api<PageSetting>(`/page-settings/${id}`, { method: 'PUT', body }),
      remove: (id: number) => api(`/page-settings/${id}`, { method: 'DELETE' })
    },

    // Pengaturan Sistem (nama aplikasi, pengumuman, batasan & jam peminjaman, mode pemeliharaan)
    // Catatan: update mengirim SELURUH field — server mewajibkan semuanya required.
    sistem: {
      show: () => api<SistemSetting>('/pengaturan-sistem'),
      update: (body: SistemSetting) =>
        api<SistemSetting>('/pengaturan-sistem', { method: 'PUT', body })
    },

    // Tahun Ajaran (CRUD admin + set aktif) — filter data seluruh aplikasi
    tahunAjaran: {
      list: () => api<TahunAjaran[]>('/tahun-ajaran'),
      create: (body: Record<string, any>) => api<TahunAjaran>('/tahun-ajaran', { method: 'POST', body }),
      update: (id: number, body: Record<string, any>) => api<TahunAjaran>(`/tahun-ajaran/${id}`, { method: 'PUT', body }),
      remove: (id: number) => api(`/tahun-ajaran/${id}`, { method: 'DELETE' }),
      setAktif: (body: { tahun_ajaran_id: number; semester: 'ganjil' | 'genap' }) =>
        api<TahunAjaranAktif>('/tahun-ajaran/aktif', { method: 'POST', body }),
      aktif: () => api<TahunAjaranAktif>('/tahun-ajaran/aktif')
    }
  }
}
