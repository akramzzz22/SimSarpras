import { defineStore } from 'pinia'

export type UserRole =
  | 'admin'
  | 'staff_sarpras'
  | 'kaproli'
  | 'guru'
  | 'murid'
  | 'kepsek'

interface AuthState {
  token: string | null
  /** Role utama (primary) — role pertama dari daftar roles */
  role: UserRole | null
  /** Semua role user (mendukung double job: guru + kaproli, dst.) */
  roles: UserRole[]
  user: Record<string, any> | null
}

// Session disimpan ke cookie agar tetap ada saat SSR (refresh halaman)
// dan tersinkron antara server & client. Cookie punya masa berlaku 30 hari.
const COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 30,
  sameSite: 'lax' as const,
  path: '/'
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    role: null,
    roles: [],
    user: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,

    /** Cek apakah user punya sebuah role (mendukung double job). */
    hasRole: (state) => (role: string) =>
      state.roles.includes(role as UserRole) || state.role === role
  },

  actions: {
    // Baca session dari cookie (dipanggil plugin saat app start, aman untuk SSR)
    hydrate() {
      const token = useCookie<string | null>('auth_token', COOKIE_OPTIONS)
      const role = useCookie<string | null>('auth_role', COOKIE_OPTIONS)
      const user = useCookie<string | null>('auth_user', COOKIE_OPTIONS)
      const roles = useCookie<string | null>('auth_roles', COOKIE_OPTIONS)

      if (token.value) {
        // Cookie tidak konsisten (mis. role/user hilang) → bersihkan semua agar
        // tidak stuck di state 'authenticated' tapi tanpa role.
        if (!role.value || !user.value) {
          this.logout()
          return
        }
        this.token = token.value
        this.role = (role.value as UserRole) || null
        try {
          this.roles = roles.value ? (JSON.parse(roles.value) as UserRole[]) : []
        } catch {
          this.roles = []
        }
        // Fallback: bila cookie auth_roles belum ada (sesi lama) → pakai role tunggal
        if (!this.roles.length && this.role) this.roles = [this.role]
        try {
          this.user = user.value ? JSON.parse(user.value) : null
        } catch {
          this.user = null
        }
      }
    },

    setSession(token: string, user: Record<string, any>, role: UserRole, roles?: UserRole[]) {
      this.token = token
      this.user = user
      this.role = role
      this.roles = roles && roles.length ? roles : [role]

      useCookie<string | null>('auth_token', COOKIE_OPTIONS).value = token
      useCookie<string | null>('auth_role', COOKIE_OPTIONS).value = role
      useCookie<string | null>('auth_roles', COOKIE_OPTIONS).value = JSON.stringify(this.roles)
      useCookie<string | null>('auth_user', COOKIE_OPTIONS).value = JSON.stringify(user ?? {})
    },

    logout() {
      this.token = null
      this.user = null
      this.role = null
      this.roles = []

      useCookie<string | null>('auth_token', COOKIE_OPTIONS).value = null
      useCookie<string | null>('auth_role', COOKIE_OPTIONS).value = null
      useCookie<string | null>('auth_roles', COOKIE_OPTIONS).value = null
      useCookie<string | null>('auth_user', COOKIE_OPTIONS).value = null
    }
  }
})
