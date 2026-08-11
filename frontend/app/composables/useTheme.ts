import { ref } from 'vue'
import {
  loadThemeMode,
  saveThemeMode,
  applyThemeMode,
  type ThemeMode
} from '~/utils/theme'

const mode = ref<ThemeMode>('default')
let initialized = false

/** Mode tampilan aplikasi (default/terang/gelap) — tersimpan di localStorage. */
export function useTheme() {
  if (!initialized) {
    mode.value = loadThemeMode()
    applyThemeMode(mode.value)
    initialized = true
  }

  function setMode(m: ThemeMode) {
    mode.value = m
    applyThemeMode(m)
    saveThemeMode(m)
  }

  return { mode, setMode }
}
