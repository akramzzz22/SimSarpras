// ============================================================
// TYPES API — kontrak data dari server.
// Dipakai bersama oleh semua modul service (app/services/api/modules/*)
// dan halaman-halaman. Di-re-export dari app/services/api/admin.ts
// supaya import lama ('~/services/api/admin') tetap berfungsi.
// ============================================================

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
