// ============================================================
// MODUL AKUN — generate/lihat/reset password & status aktif user.
// Bagian dari useAdminService() (lihat app/services/api/admin.ts).
// ============================================================
import type { ApiClient } from '../client'
import type { AkunMurid, UserItem } from '../types'

export function useAkunApi(api: ApiClient) {
  return {
    // Fitur akun (generate/lihat/reset password)
    akun: {
      generate: (id: number) => api<AkunMurid>(`/users/${id}/generate-akun`, { method: 'POST' }),
      resetPassword: (id: number) => api<AkunMurid>(`/users/${id}/reset-password`, { method: 'POST' }),
      lihatPassword: (id: number) => api<AkunMurid>(`/users/${id}/lihat-password`),
      toggleAktif: (id: number) => api<UserItem>(`/users/${id}/toggle-aktif`, { method: 'POST' })
    }
  }
}
