<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { AlertTriangle, ArrowLeftRight, Wrench, RefreshCw, Boxes } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'staff', middleware: ['auth'], title: 'Dashboard' })

const admin = useAdminService()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref<string | null>(null)
const barang = ref<any[]>([])
const laporan = ref<any[]>([])
const peminjaman = ref<any[]>([])
const maintenance = ref<any[]>([])

const myTasks = computed(() => laporan.value.filter((l) => l.assigned_to === authStore.user?.id && l.status !== 'selesai').length)

const stats = computed(() => ({
  barang: barang.value.length,
  rusak: barang.value.filter((b) => b.status === 'rusak').length,
  laporanMenunggu: laporan.value.filter((l) => l.status === 'menunggu').length,
  peminjamanAktif: peminjaman.value.filter((p) => ['menunggu', 'disetujui', 'dipinjam'].includes(p.status)).length,
  maintenanceAktif: maintenance.value.filter((m) => ['terjadwal', 'berlangsung'].includes(m.status)).length
}))

async function load() {
  loading.value = true
  error.value = null
  try {
    const [b, l, p, m] = await Promise.all([
      admin.barang.list({ per_page: 100 }),
      admin.laporan.list({ per_page: 100 }),
      admin.peminjaman.list({ per_page: 100 }),
      admin.maintenance.list({ per_page: 100 })
    ])
    barang.value = b.data
    laporan.value = l.data
    peminjaman.value = p.data
    maintenance.value = m.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat dashboard.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Selamat datang, {{ authStore.user?.name ?? 'Staff' }} 👋</h2>
        <p class="text-sm text-gray-500 mt-1">Ringkasan kondisi aset dan tugas Anda.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide"><Boxes class="w-4 h-4" /> Total Barang</div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ stats.barang }}</div>
      </div>
      <div class="bg-rose-50 rounded-2xl border border-rose-100 p-4">
        <div class="flex items-center gap-2 text-rose-500 text-xs font-medium uppercase tracking-wide"><AlertTriangle class="w-4 h-4" /> Barang Rusak</div>
        <div class="text-2xl font-bold text-rose-700 mt-1">{{ stats.rusak }}</div>
      </div>
      <div class="bg-amber-50 rounded-2xl border border-amber-100 p-4">
        <div class="flex items-center gap-2 text-amber-500 text-xs font-medium uppercase tracking-wide"><Wrench class="w-4 h-4" /> Tugas Saya</div>
        <div class="text-2xl font-bold text-amber-700 mt-1">{{ myTasks }}</div>
      </div>
      <div class="bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <div class="flex items-center gap-2 text-blue-500 text-xs font-medium uppercase tracking-wide"><ArrowLeftRight class="w-4 h-4" /> Peminjaman Aktif</div>
        <div class="text-2xl font-bold text-blue-700 mt-1">{{ stats.peminjamanAktif }}</div>
      </div>
    </div>

    <!-- Maintenance terdekat -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Wrench class="w-4 h-4 text-violet-600" />
        <h3 class="font-semibold text-gray-900">Maintenance Aktif</h3>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="m in maintenance.filter((x) => x.status !== 'selesai')" :key="m.id" class="px-5 py-3.5 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <Wrench class="w-4 h-4 text-violet-600" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</div>
            <div class="text-xs text-gray-400">{{ m.tanggal_jadwal }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full bg-violet-100 text-violet-800 shrink-0">{{ m.status }}</span>
        </div>
        <div v-if="!maintenance.filter((x) => x.status !== 'selesai').length" class="px-5 py-8 text-center text-sm text-gray-400">
          Tidak ada maintenance aktif.
        </div>
      </div>
    </div>
  </div>
</template>
