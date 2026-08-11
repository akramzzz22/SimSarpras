/** Mode tampilan: default (standar aplikasi) / terang (paksa) / gelap (paksa). */
export type ThemeMode = 'default' | 'light' | 'dark'

export const THEME_KEY = 'app-theme'

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' }
]

/** Terapkan mode ke <html> — class `.dark` untuk gelap, `data-theme="light"` untuk terang paksa. */
export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  el.classList.toggle('dark', mode === 'dark')
  if (mode === 'light') el.setAttribute('data-theme', 'light')
  else el.removeAttribute('data-theme')
}

/** Baca preferensi tersimpan; default = mode standar aplikasi. */
export function loadThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'default'
  const s = window.localStorage.getItem(THEME_KEY)
  return s === 'light' || s === 'dark' ? s : 'default'
}

export function saveThemeMode(mode: ThemeMode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(THEME_KEY, mode)
}
