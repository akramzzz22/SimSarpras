// Mapping role -> halaman utama (dashboard) masing-masing role
export const roleHomeMap: Record<string, string> = {
  admin: '/admin',
  staff_sarpras: '/staff',
  kaproli: '/kaproli',
  guru: '/guru',
  murid: '/murid',
  kepsek: '/kepsek',
}

export function roleHome(role?: string | null): string {
  return roleHomeMap[role ?? ''] ?? '/admin'
}
