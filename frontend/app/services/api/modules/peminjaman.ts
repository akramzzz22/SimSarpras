// ============================================================
// MODUL PEMINJAMAN — pengajuan & alur persetujuan barang.
// Bagian dari useAdminService() (lihat app/services/api/admin.ts).
// ============================================================
import type { ApiClient } from '../client'
import type { Paginated, Peminjaman } from '../types'

export function usePeminjamanApi(api: ApiClient) {
  return {
    peminjaman: {
      list: (params?: Record<string, any>) => api<Paginated<Peminjaman>>('/peminjaman', { params }),
      show: (id: number) => api<Peminjaman>(`/peminjaman/${id}`),
      create: (body: Record<string, any>) => api<Peminjaman[]>('/peminjaman', { method: 'POST', body }),
      approve: (id: number) => api(`/peminjaman/${id}/approve`, { method: 'POST' }),
      reject: (id: number) => api(`/peminjaman/${id}/reject`, { method: 'POST' }),
      kembalikan: (id: number, body?: Record<string, any>) =>
        api(`/peminjaman/${id}/kembalikan`, { method: 'POST', body: body ?? {} })
    }
  }
}
