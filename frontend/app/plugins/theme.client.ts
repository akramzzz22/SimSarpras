import { loadThemeMode, applyThemeMode } from '~/utils/theme'

/** Terapkan tema tersimpan sebelum aplikasi dirender — mencegah kedipan mode gelap. */
export default defineNuxtPlugin(() => {
  applyThemeMode(loadThemeMode())
})
