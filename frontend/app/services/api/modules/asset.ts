// ============================================================
// MODUL ASET — upload gambar, barang, jadwal booking, mutasi.
// Bagian dari useAdminService() (lihat app/services/api/admin.ts).
// ============================================================
import type { ApiClient } from '../client'
import type { Barang, BarangJadwal, MutasiBarang, Paginated } from '../types'

export function useAssetApi(api: ApiClient) {
  return {
    // Upload gambar → URL publik. Utilitas BERSAMA (dipakai foto barang,
    // resi maintenance, dokumentasi, dsb) — ditempatkan di modul aset
    // karena mayoritas penggunaannya berkaitan dengan aset.
    upload: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api<{ url: string }>('/upload', { method: 'POST', body: form })
    },

    // Barang (inventaris aset)
    barang: {
      list: (params?: Record<string, any>) => api<Paginated<Barang>>('/barang', { params }),
      show: (id: number) => api<Barang>(`/barang/${id}`),
      byKode: (kode: string) => api<Barang>(`/barang/by-kode/${encodeURIComponent(kode)}`),
      create: (body: Partial<Barang>) => api<Barang>('/barang', { method: 'POST', body }),
      update: (id: number, body: Partial<Barang>) => api<Barang>(`/barang/${id}`, { method: 'PUT', body }),
      remove: (id: number) => api(`/barang/${id}`, { method: 'DELETE' })
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

    // Mutasi Barang (Barang Masuk / Keluar / Pindah Ruangan)
    mutasi: {
      list: (params?: Record<string, any>) => api<Paginated<MutasiBarang>>('/mutasi-barang', { params }),
      create: (body: Record<string, any>) => api<MutasiBarang>('/mutasi-barang', { method: 'POST', body }),
      remove: (id: number) => api(`/mutasi-barang/${id}`, { method: 'DELETE' })
    }
  }
}
