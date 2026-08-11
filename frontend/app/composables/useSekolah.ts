import { onMounted } from 'vue'
import { sekolah as sekolahBase } from '~/config/sekolah'
import { useAdminService } from '~/services/api/admin'

/**
 * Logo yang disimpan di tabel page_settings (dikelola lewat Pengaturan → Logo).
 * page_key → field pada objek sekolah.
 */
export const LOGO_KEYS = {
  aplikasi: 'logo-aplikasi',
  pemprov: 'logo-pemprov',
  disdik: 'logo-disdik',
  sekolah: 'logo-sekolah',
  pattern: 'pattern-header'
} as const

/**
 * Identitas sekolah dinamis.
 *
 * Menggabungkan config statis (frontend/app/config/sekolah.ts) dengan logo
 * yang diunggah admin lewat Pengaturan → Logo. Data diambil dari API
 * page-settings (publik) sekali per sesi — bila admin mengubah logo, tampilan
 * header/layout otomatis ikut berubah tanpa edit kode.
 */
export function useSekolah() {
  const admin = useAdminService()

  // useState agar hasil fetch dibagikan ke semua komponen dalam satu sesi
  // (tidak fetch berulang di tiap layout/halaman).
  const sekolah = useState('sekolah-dinamis', () => ({ ...sekolahBase }))
  const loaded = useState('sekolah-dinamis-loaded', () => false)

  async function load() {
    try {
      const res = await admin.pageSettings.list()
      const map = new Map<string, string>()
      for (const p of res) {
        if (p.gambar) map.set(p.page_key, p.gambar)
      }
      const patch: Record<string, string> = {}
      if (map.get(LOGO_KEYS.aplikasi)) patch.fotoAplikasi = map.get(LOGO_KEYS.aplikasi)!
      if (map.get(LOGO_KEYS.pemprov)) patch.fotoPemprov = map.get(LOGO_KEYS.pemprov)!
      if (map.get(LOGO_KEYS.disdik)) patch.fotoDinas = map.get(LOGO_KEYS.disdik)!
      if (map.get(LOGO_KEYS.sekolah)) patch.fotoSekolah = map.get(LOGO_KEYS.sekolah)!
      if (map.get(LOGO_KEYS.pattern)) patch.patternHeader = map.get(LOGO_KEYS.pattern)!
      if (Object.keys(patch).length) sekolah.value = { ...sekolah.value, ...patch }
    } catch {
      // Gagal memuat → pakai logo bawaan dari config
    }

    // Pengaturan sistem (nama aplikasi, pengumuman, mode pemeliharaan) —
    // diubah admin lewat Pengaturan → Pengaturan Sistem.
    try {
      const s = await admin.sistem.show()
      sekolah.value = {
        ...sekolah.value,
        namaAplikasi: s.nama_aplikasi,
        pengumuman: s.pengumuman,
        modePemeliharaan: s.mode_pemeliharaan
      }
    } catch {
      // Gagal memuat → pakai nilai bawaan dari config
    }
  }

  onMounted(async () => {
    if (loaded.value) return
    loaded.value = true
    await load()
  })

  /** Muat ulang logo dari server — dipanggil setelah admin menyimpan logo baru. */
  async function refresh() {
    await load()
  }

  return { sekolah, refresh }
}
