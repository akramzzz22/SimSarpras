<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { History, AlertTriangle, Wrench, RefreshCw, Inbox, CheckCircle2 } from 'lucide-vue-next'
import { useAdminService, type LaporanKerusakan, type Maintenance } from '~/services/api/admin'

definePageMeta({ layout: 'staff', middleware: ['auth'], title: 'Riwayat' })

const admin = useAdminService()
const authStore = useAuthStore()

const laporan = ref<LaporanKerusakan[]>([])
const maintenance = ref<Maintenance[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const tab = ref<'laporan' | 'maintenance'>('laporan')

const doneLaporan = computed(() =>
  laporan.value.filter((l) => l.assigned_to === authStore.user?.id && l.status === 'selesai')
)
const doneMaintenance = computed(() =>
  maintenance.value.filter((m) => m.staff_id === authStore.user?.id && m.status === 'selesai')
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [l, m] = await Promise.all([
      admin.laporan.list({ per_page: 100 }),
      admin.maintenance.list({ per_page: 100 })
    ])
    laporan.value = l.data
    maintenance.value = m.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat riwayat.'
  } finally {
    loading.value = false
  }
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Riwayat</h2>
        <p class="text-sm text-gray-500 mt-1">Pekerjaan yang telah Anda selesaikan.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <div class="flex gap-2">
      <button
        class="px-4 py-2 rounded-xl text-sm font-medium border transition"
        :class="tab === 'laporan' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="tab = 'laporan'"
      >
        Kerusakan ({{ doneLaporan.length }})
      </button>
      <button
        class="px-4 py-2 rounded-xl text-sm font-medium border transition"
        :class="tab === 'maintenance' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="tab = 'maintenance'"
      >
        Maintenance ({{ doneMaintenance.length }})
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="space-y-3">
      <template v-if="tab === 'laporan'">
        <div v-for="l in doneLaporan" :key="l.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 class="w-4 h-4 text-emerald-600" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
            <div class="text-xs text-gray-400">{{ fmt(l.created_at) }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">selesai</span>
        </div>
        <div v-if="!doneLaporan.length && !loading" class="py-10 text-center text-gray-400 text-sm">
          <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" /> Belum ada riwayat kerusakan selesai.
        </div>
      </template>

      <template v-else>
        <div v-for="m in doneMaintenance" :key="m.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Wrench class="w-4 h-4 text-emerald-600" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</div>
            <div class="text-xs text-gray-400">{{ fmt(m.tanggal_jadwal) }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">selesai</span>
        </div>
        <div v-if="!doneMaintenance.length && !loading" class="py-10 text-center text-gray-400 text-sm">
          <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" /> Belum ada riwayat maintenance selesai.
        </div>
      </template>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
