// ============================================================
// MODUL PENGATURAN — role, permission, page settings, sistem,
// tahun ajaran, dan log aktivitas.
// Bagian dari useAdminService() (lihat app/services/api/admin.ts).
// ============================================================
import type { ApiClient } from '../client'
import type {
  ActivityLog,
  PageSetting,
  Paginated,
  PermissionItem,
  SistemSetting,
  TahunAjaran,
  TahunAjaranAktif
} from '../types'

export function usePengaturanApi(api: ApiClient) {
  return {
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
    },

    // Log Aktivitas (halaman Pengaturan → Log Aktivitas)
    activityLogs: {
      list: (params?: Record<string, any>) => api<Paginated<ActivityLog>>('/activity-logs', { params })
    }
  }
}
