import { onMounted } from 'vue'
import { useAdminService, type TahunAjaranAktif } from '~/services/api/admin'

/**
 * Info Tahun Ajaran aktif (dari Pengaturan → Tahun Ajaran).
 * State dibagikan antar komponen; fetch sekali per sesi dari endpoint publik.
 */
export function useTahunAjaran() {
  const admin = useAdminService()

  const aktif = useState<TahunAjaranAktif | null>('tahun-ajaran-aktif', () => null)
  const loaded = useState('tahun-ajaran-aktif-loaded', () => false)

  async function load() {
    try {
      aktif.value = await admin.tahunAjaran.aktif()
    } catch {
      aktif.value = null
    }
  }

  onMounted(async () => {
    if (loaded.value) return
    loaded.value = true
    await load()
  })

  /** Panggil setelah admin mengganti TA aktif di Pengaturan. */
  async function refresh() {
    await load()
  }

  return { aktif, refresh }
}
