<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { BarChart3, Boxes, AlertTriangle, ArrowLeftRight, RefreshCw, ClipboardCheck } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'mobile', middleware: ['auth', 'kepsek'], title: 'Monitoring' })

const admin = useAdminService()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref<string | null>(null)
const barang = ref<any[]>([])
const laporan = ref<any[]>([])
const peminjaman = ref<any[]>([])
const maintenance = ref<any[]>([])

const stats = computed(() => ({
  totalBarang: barang.value.length,
  barangAktif: barang.value.filter((b) => b.status === 'aktif').length,
  barangRusak: barang.value.filter((b) => b.status === 'rusak').length,
  laporanMenunggu: laporan.value.filter((l) => l.status === 'menunggu').length,
  laporanSelesai: laporan.value.filter((l) => l.status === 'selesai').length,
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
    error.value = e?.data?.message ?? 'Gagal memuat data.'
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
        <h2 class="text-sm font-bold text-gray-900">Selamat datang, {{ authStore.user?.name ?? 'Kepala Sekolah' }} 👋</h2>
        <p class="text-sm text-gray-500 mt-0.5">Ringkasan kondisi aset sekolah.</p>
      </div>
      <button class="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide"><Boxes class="w-4 h-4" /> Total Barang</div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ stats.totalBarang }}</div>
        <div class="text-xs text-emerald-600 mt-1">{{ stats.barangAktif }} aktif</div>
      </div>
      <div class="bg-rose-50 rounded-2xl border border-rose-100 p-4">
        <div class="flex items-center gap-2 text-rose-500 text-xs font-medium uppercase tracking-wide"><AlertTriangle class="w-4 h-4" /> Barang Rusak</div>
        <div class="text-2xl font-bold text-rose-700 mt-1">{{ stats.barangRusak }}</div>
      </div>
      <div class="bg-amber-50 rounded-2xl border border-amber-100 p-4">
        <div class="flex items-center gap-2 text-amber-500 text-xs font-medium uppercase tracking-wide"><ClipboardCheck class="w-4 h-4" /> Kerusakan Menunggu</div>
        <div class="text-2xl font-bold text-amber-700 mt-1">{{ stats.laporanMenunggu }}</div>
      </div>
      <div class="bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <div class="flex items-center gap-2 text-blue-500 text-xs font-medium uppercase tracking-wide"><ArrowLeftRight class="w-4 h-4" /> Peminjaman Aktif</div>
        <div class="text-2xl font-bold text-blue-700 mt-1">{{ stats.peminjamanAktif }}</div>
      </div>
    </div>

    <NuxtLink to="/kepsek/monitoring" class="block bg-emerald-600 rounded-2xl p-5 text-white hover:bg-emerald-700 transition">
      <div class="flex items-center gap-3">
        <BarChart3 class="w-6 h-6" />
        <div>
          <div class="font-semibold">Lihat Monitoring Lengkap</div>
          <div class="text-xs text-emerald-100 mt-0.5">Pantau seluruh aset, kerusakan, dan maintenance.</div>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
