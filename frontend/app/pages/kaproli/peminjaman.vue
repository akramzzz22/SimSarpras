<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ArrowLeftRight, Inbox } from 'lucide-vue-next'
import { useAdminService, type Peminjaman } from '~/services/api/admin'
import { fmtJam } from '~/utils/format'
import SlotJamIndicator from '~/components/ui/slot-jam-indicator.vue'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'staff', middleware: ['auth', 'kaproli'], title: 'Peminjaman' })

const admin = useAdminService()

const items = ref<Peminjaman[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const filterStatus = ref('all')

const filtered = computed(() =>
  filterStatus.value === 'all' ? items.value : items.value.filter((p) => p.status === filterStatus.value)
)

// ---- Pagination: 20 data per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedFiltered = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(filtered, () => {
  page.value = 1
})

const statusOptions = ['all', 'menunggu', 'disetujui', 'ditolak', 'dipinjam', 'dikembalikan'] as const

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.peminjaman.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat peminjaman.'
  } finally {
    loading.value = false
  }
}

const badge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-50 text-amber-700',
    disetujui: 'bg-blue-50 text-blue-700',
    dipinjam: 'bg-violet-50 text-violet-700',
    dikembalikan: 'bg-emerald-50 text-emerald-700',
    ditolak: 'bg-rose-50 text-rose-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-sm font-bold text-gray-900">Peminjaman</h2>
      <p class="text-sm text-gray-500 mt-1">Daftar seluruh peminjaman barang proli.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="s in statusOptions"
        :key="s"
        class="px-3 py-1.5 rounded text-sm font-medium border transition"
        :class="filterStatus === s ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="filterStatus = s"
      >
        {{ s }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="p in pagedFiltered" :key="p.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <ArrowLeftRight class="w-5 h-5 text-blue-600" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">Peminjam: {{ p.peminjam?.name ?? 'User' }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded shrink-0" :class="badge(p.status)">{{ p.status }}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Tanggal: <b class="text-gray-700">{{ fmt(p.tanggal_pinjam) }}</b></span>
          <span>Jam: <b class="text-gray-700">{{ fmtJam(p.jam_mulai) }} – {{ fmtJam(p.jam_selesai) }}</b></span>
        </div>

        <!-- Indikator visual slot jam: merah = jam dipesan, hijau = jam tersedia -->
        <SlotJamIndicator :jam-mulai="p.jam_mulai" :jam-selesai="p.jam_selesai" />
      </div>

      <div v-if="!filtered.length && !loading" class="md:col-span-2 py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">{{ items.length ? 'Tidak ada peminjaman dengan status ini.' : 'Belum ada data peminjaman.' }}</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

    <!-- Pagination: 20 data per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="peminjaman" />
  </div>
</template>
