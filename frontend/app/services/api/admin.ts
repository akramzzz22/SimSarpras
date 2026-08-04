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
  subkategori_id?: number | null
  ruangan_id?: number | null
  status: 'aktif' | 'rusak' | 'dipinjam' | 'maintenance'
  proli?: { id: number; nama: string } | null
  kategori?: { id: number; nama: string } | null
  subkategori?: { id: number; nama: string; proli?: { id: number; nama: string } | null } | null
  ruangan?: { id: number; nama: string; gedung?: { id: number; nama: string } | null } | null
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
  roles?: { id: number; name: string }[]
  kelas?: string | null
  jurusan_id?: number | null
  jurusan?: { id: number; nama: string } | null
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
  barang?: { id: number; nama: string; kode_qr?: string; owner_type?: 'sarpras' | 'proli' } | null
  pelapor?: { id: number; name: string } | null
  assignedStaff?: { id: number; name: string } | null
  vendor?: { id: number; nama: string } | null
  created_at?: string
}

// ============ Peminjaman ============
export interface Peminjaman {
  id: number
  barang_id: number
  peminjam_id: number
  status: 'menunggu' | 'disetujui' | 'ditolak' | 'dipinjam' | 'dikembalikan'
  tanggal_pinjam?: string
  jam_mulai?: number | null
  jam_selesai?: number | null
  keperluan?: string | null
  foto_pinjam?: string | null
  foto_kembali?: string | null
  disetujui_oleh?: number | null
  barang?: { id: number; nama: string; kode_qr?: string; kategori?: { id: number; nama: string } | null; ruangan?: { id: number; nama: string } | null } | null
  peminjam?: { id: number; name: string; kelas?: string | null; jurusan?: { id: number; nama: string } | null } | null
  penyetuju?: { id: number; name: string } | null
  created_at?: string
}

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
  barang?: { id: number; nama: string } | null
  staff?: { id: number; name: string } | null
  vendor?: { id: number; nama: string } | null
  created_at?: string
  // state UI lokal (bukan dari backend)
  showResi?: boolean
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
      lihatPassword: (id: number) => api<AkunMurid>(`/users/${id}/lihat-password`)
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
      create: (body: Record<string, any>) => api<Peminjaman>('/peminjaman', { method: 'POST', body }),
      approve: (id: number) => api(`/peminjaman/${id}/approve`, { method: 'POST' }),
      reject: (id: number) => api(`/peminjaman/${id}/reject`, { method: 'POST' }),
      kembalikan: (id: number, body?: Record<string, any>) =>
        api(`/peminjaman/${id}/kembalikan`, { method: 'POST', body: body ?? {} })
    },

    // Roles
    roles: {
      list: () => api<{ id: number; name: string; users_count?: number }[]>('/roles'),
      create: (body: { name: string }) => api('/roles', { method: 'POST', body }),
      remove: (id: number) => api(`/roles/${id}`, { method: 'DELETE' })
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
    }
  }
}
