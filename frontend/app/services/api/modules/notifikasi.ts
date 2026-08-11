// ============================================================
// MODUL NOTIFIKASI — daftar & tandai terbaca (top bar admin).
// Bagian dari useAdminService() (lihat app/services/api/admin.ts).
// ============================================================
import type { ApiClient } from '../client'
import type { AppNotification } from '../types'

export function useNotifikasiApi(api: ApiClient) {
  return {
    // Notifikasi (staff melihat jadwal maintenance baru)
    notifications: {
      list: () => api<{ data: AppNotification[]; unread_count: number }>('/notifications'),
      markRead: (id: string) => api(`/notifications/${id}/read`, { method: 'POST' }),
      markAllRead: () => api('/notifications/read-all', { method: 'POST' })
    }
  }
}
