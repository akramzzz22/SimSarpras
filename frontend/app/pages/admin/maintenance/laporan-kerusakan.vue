<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { FileText, AlertTriangle, RefreshCw, Wrench, CheckCircle2, XCircle } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Laporan Kerusakan' })

const admin = useAdminService()
const route = useRoute()

const items = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
// 'diproses' = gabungan diverifikasi + diperbaiki (menu Pelaporan → Diproses)
const filterStatus = ref<'all' | 'menunggu' | 'diproses' | 'diverifikasi' | 'diperbaiki' | 'selesai'>('all')
const verifyingId = ref<number | null>(null)

const filtered = computed(() => {
  if (filterStatus.value === 'all') return items.value
  if (filterStatus.value === 'diproses') {
    return items.value.filter((l) => ['diverifikasi', 'diperbaiki'].includes(l.status))
  }
  return items.value.filter((l) => l.status === filterStatus.value)
})

// ---- Pagination: 20 laporan per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedFiltered = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(filtered, () => {
  page.value = 1
})

// Menu Pelaporan mengarah dengan query ?status=… — map ke filter lokal.
function applyQueryStatus() {
  const s = String(route.query.status ?? '')
  if (!s) return
  if (s === 'menunggu' || s === 'selesai' || s === 'diverifikasi' || s === 'diperbaiki') {
    filterStatus.value = s
  } else if (s === 'diverifikasi,diperbaiki') {
    filterStatus.value = 'diproses'
  }
}

const statusOptions = [
  { v: 'all', l: 'Semua' },
  { v: 'menunggu', l: 'Menunggu' },
  { v: 'diproses', l: 'Diproses' },
  { v: 'diverifikasi', l: 'Diverifikasi' },
  { v: 'diperbaiki', l: 'Diperbaiki' },
  { v: 'selesai', l: 'Selesai' }
] as const

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.laporan.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat laporan kerusakan.'
  } finally {
    loading.value = false
  }
}

async function verifikasi(id: number) {
  verifyingId.value = id
  try {
    await admin.laporan.verifikasi(id, {})
    await load()
  } catch {
    alert('Gagal memverifikasi laporan.')
  } finally {
    verifyingId.value = null
  }
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-50 text-amber-700',
    diverifikasi: 'bg-red-50 text-red-700',
    diperbaiki: 'bg-violet-50 text-violet-700',
    selesai: 'bg-emerald-50 text-emerald-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const formatTanggal = (d?: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

// Reaktif terhadap navigasi antar menu Pelaporan (query berubah tanpa remount).
watch(
  () => route.query.status,
  () => {
    applyQueryStatus()
    load()
  },
  { immediate: true }
)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Laporan Kerusakan</h2>
        <p class="text-sm text-gray-500 mt-1">Laporan kerusakan dari guru/murid dan status penanganannya.</p>
      </div>
      <button class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition" @click="load">
        <RefreshCw class="w-4 h-4" />
        Muat Ulang
      </button>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="s in statusOptions"
        :key="s.v"
        class="px-3 py-1.5 rounded text-sm font-medium border transition"
        :class="filterStatus === s.v ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="filterStatus = s.v"
      >
        {{ s.l }}
      </button>
    </div>

    <div v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</div>

    <!-- Cards -->
    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="l in pagedFiltered" :key="l.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <AlertTriangle class="w-5 h-5 text-rose-500" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ formatTanggal(l.created_at) }} • oleh {{ l.pelapor?.name ?? 'User' }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded shrink-0" :class="statusBadge(l.status)">{{ l.status }}</span>
        </div>

        <p class="mt-3 text-sm text-gray-600 line-clamp-2">{{ l.deskripsi }}</p>

        <div class="mt-4 flex items-center gap-2">
          <button
            v-if="l.status === 'menunggu'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition disabled:opacity-60"
            :disabled="verifyingId === l.id"
            @click="verifikasi(l.id)"
          >
            <CheckCircle2 v-if="verifyingId !== l.id" class="w-3.5 h-3.5" />
            <Wrench v-else class="w-3.5 h-3.5 animate-spin" />
            Verifikasi
          </button>
          <span v-else class="text-xs text-gray-400">
            <CheckCircle2 class="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
            Ditangani
          </span>
        </div>
      </div>

      <div v-if="!filtered.length && !loading" class="md:col-span-2 py-12 text-center">
        <XCircle class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">Tidak ada laporan dengan status ini.</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

    <!-- Pagination: 20 laporan per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="laporan" />
  </div>
</template>
