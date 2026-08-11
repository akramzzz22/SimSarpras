// Mapping role -> halaman utama (dashboard) masing-masing role
export const roleHomeMap: Record<string, string> = {
  admin: '/admin',
  staff_sarpras: '/staff',
  kaproli: '/kaproli',
  guru: '/guru',
  murid: '/murid',
  kepsek: '/kepsek',
}

// Label peran yang ramah dibaca
export const roleLabelMap: Record<string, string> = {
  admin: 'Administrator',
  staff_sarpras: 'Staf Sarpras',
  kaproli: 'Ketua Proli',
  guru: 'Guru',
  murid: 'Murid',
  kepsek: 'Kepala Sekolah',
}

// Urutan prioritas: role dengan prioritas lebih tinggi dianggap "utama"
// saat user punya beberapa role (double job).
const ROLE_PRIORITY = ['admin', 'kepsek', 'kaproli', 'staff_sarpras', 'guru', 'murid']

/** Ambil role utama dari daftar roles (prioritas tertinggi). */
export function primaryRole(roles?: (string | null)[] | null): string {
  const list = (roles ?? []).filter((r): r is string => !!r)
  if (!list.length) return 'admin'
  for (const p of ROLE_PRIORITY) {
    if (list.includes(p)) return p
  }
  return list[0]!
}

/** Halaman utama berdasarkan daftar roles (mendukung double job). */
export function rolesHome(roles?: (string | null)[] | null): string {
  return roleHome(primaryRole(roles))
}

export function roleHome(role?: string | null): string {
  return roleHomeMap[role ?? ''] ?? '/admin'
}

export function roleLabel(role?: string | null): string {
  return roleLabelMap[role ?? ''] ?? (role ? role.replace('_', ' ') : '—')
}
