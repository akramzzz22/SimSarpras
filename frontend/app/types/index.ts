export interface Barang {
  id: number
  nama: string
  deskripsi?: string | null
  kode_qr: string
  owner_type: 'sarpras' | 'proli'
  proli_id?: number
  status: 'aktif' | 'rusak' | 'dipinjam' | 'maintenance'
  bisa_dipinjam?: boolean
}

export interface LaporanKerusakan {
  id: number
  barang_id: number
  pelapor_id: number
  deskripsi: string
  foto_url?: string
  status: 'menunggu' | 'diverifikasi' | 'diperbaiki' | 'selesai'
}

export interface Peminjaman {
  id: number
  barang_id: number
  peminjam_id: number
  status: 'menunggu' | 'disetujui' | 'ditolak' | 'dipinjam' | 'dikembalikan'
  tanggal_pinjam?: string
  jam_mulai?: string | null
  jam_selesai?: string | null
  foto_pinjam?: string | null
  foto_kembali?: string | null
}
