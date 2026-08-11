// ============================================================
// MODUL MAINTENANCE — laporan kerusakan, penjadwalan perbaikan, vendor.
// Bagian dari useAdminService() (lihat app/services/api/admin.ts).
// ============================================================
import type { ApiClient } from '../client'
import type { LaporanKerusakan, Maintenance, Paginated } from '../types'

export function useMaintenanceApi(api: ApiClient) {
  return {
    // Laporan Kerusakan
    laporan: {
      list: (params?: Record<string, any>) => api<Paginated<LaporanKerusakan>>('/laporan-kerusakan', { params }),
      create: (body: Record<string, any>) => api<LaporanKerusakan>('/laporan-kerusakan', { method: 'POST', body }),
      update: (id: number, body: Record<string, any>) =>
        api(`/laporan-kerusakan/${id}`, { method: 'PUT', body }),
      verifikasi: (id: number, body: Record<string, any>) =>
        api(`/laporan-kerusakan/${id}/verifikasi`, { method: 'POST', body })
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
