// ============================================================
// MODUL MASTER DATA — CRUD generik (gedung, jurusan, proli,
// ruangan, kategori-barang, kelas, satuan, kondisi, dsb).
// Bagian dari useAdminService() (lihat app/services/api/admin.ts).
// ============================================================
import type { ApiClient } from '../client'
import type { MasterItem, Paginated } from '../types'

export function useMasterApi(api: ApiClient) {
  return {
    // Master Data generik (resource = nama endpoint, mis. 'gedung', 'jurusan')
    master: {
      list: <T = MasterItem>(resource: string, params?: Record<string, any>) =>
        api<Paginated<T>>(`/${resource}`, { params }),
      show: <T = MasterItem>(resource: string, id: number) => api<T>(`/${resource}/${id}`),
      create: <T = MasterItem>(resource: string, body: Record<string, any>) =>
        api<T>(`/${resource}`, { method: 'POST', body }),
      update: <T = MasterItem>(resource: string, id: number, body: Record<string, any>) =>
        api<T>(`/${resource}/${id}`, { method: 'PUT', body }),
      remove: (resource: string, id: number) => api(`/${resource}/${id}`, { method: 'DELETE' })
    }
  }
}
