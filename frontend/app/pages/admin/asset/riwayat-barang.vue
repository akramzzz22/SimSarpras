<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { History, Search, RefreshCw, Inbox, ArrowLeftRight, PackagePlus, PackageMinus, MapPin } from 'lucide-vue-next'
import { useAdminService, type MutasiBarang } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Riwayat Barang' })

const admin = useAdminService()

const items = ref<MutasiBarang[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const filterJenis = ref<'all' | 'masuk' | 'keluar' | 'pindah'>('all')

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((m) => {
    const matchJenis = filterJenis.value === 'all' || m.jenis === filterJenis.value
    const matchQ = !q || (m.barang?.nama ?? '').toLowerCase().includes(q)
    return matchJenis && matchQ
  })
})

const page = ref(1)
const PER_PAGE = 20
const pagedFiltered = computed(() => filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))
watch(filtered, () => { page.value = 1 })

const jenisBadge = (j: string) => ({
  masuk: 'bg-emerald-50 text-emerald-700',
  keluar: 'bg-rose-50 text-rose-700',
  pindah: 'bg-blue-50 text-blue-700'
})[j as 'masuk'] ?? 'bg-gray-50 text-gray-700'

const jenisIcon = (j: string) => (j === 'masuk' ? PackagePlus : j === 'keluar' ? PackageMinus : ArrowLeftRight)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.mutasi.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat riwayat barang.'
  } finally {
    loading.value = false
  }
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-sm font-bold text-gray-900">Riwayat Barang</h2>
      <p class="text-sm text-gray-500 mt-1">Seluruh riwayat pergerakan barang: masuk, keluar, dan pindah ruangan.</p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="search" placeholder="Cari barang…" class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="o in ([{v:'all',l:'Semua'},{v:'masuk',l:'Masuk'},{v:'keluar',l:'Keluar'},{v:'pindah',l:'Pindah'}] as const)"
          :key="o.v"
          class="px-3 py-2 rounded-xl text-sm font-medium border transition"
          :class="filterJenis === o.v ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          @click="filterJenis = o.v"
        >
          {{ o.l }}
        </button>
        <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load"><RefreshCw class="w-4 h-4" /></button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- List -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Jenis</th>
              <th class="px-5 py-3">Barang</th>
              <th class="px-5 py-3">Tanggal</th>
              <th class="px-5 py-3">Lokasi</th>
              <th class="px-5 py-3">Keterangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="m in pagedFiltered" :key="m.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3.5">
                <span class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded" :class="jenisBadge(m.jenis)">
                  <component :is="jenisIcon(m.jenis)" class="w-3.5 h-3.5" />
                  {{ m.jenis }}
                </span>
              </td>
              <td class="px-5 py-3.5 font-medium text-gray-900">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</td>
              <td class="px-5 py-3.5 text-gray-500">{{ fmt(m.tanggal) }}</td>
              <td class="px-5 py-3.5">
                <span v-if="m.jenis === 'pindah'" class="inline-flex items-center gap-1 text-xs text-gray-600">
                  <MapPin class="w-3.5 h-3.5 text-gray-400" />
                  {{ m.ruanganAsal?.nama ?? '—' }}
                  <ArrowLeftRight class="w-3 h-3 text-gray-300 mx-0.5" />
                  {{ m.ruanganTujuan?.nama ?? '—' }}
                </span>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
              <td class="px-5 py-3.5 text-gray-600">{{ m.keterangan ?? '—' }}</td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td colspan="5" class="px-5 py-12 text-center text-gray-400">
                <History class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ items.length ? 'Tidak ada riwayat yang cocok.' : 'Belum ada riwayat pergerakan barang.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>

    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="riwayat" />
  </div>
</template>
