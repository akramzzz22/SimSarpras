<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Wrench, Search, RefreshCw, Inbox, Receipt } from 'lucide-vue-next'
import { useAdminService, type Maintenance } from '~/services/api/admin'
import { formatRupiah } from '~/utils/format'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Riwayat Maintenance' })

const admin = useAdminService()

const items = ref<Maintenance[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((m) => {
    const matchQ = !q || (m.barang?.nama ?? '').toLowerCase().includes(q) || (m.staff?.name ?? '').toLowerCase().includes(q) || (m.vendor?.nama ?? '').toLowerCase().includes(q)
    const matchJenis = !q || (m.jenisMaintenance?.nama ?? '').toLowerCase().includes(q)
    return matchQ || matchJenis
  })
})

const page = ref(1)
const PER_PAGE = 20
const pagedFiltered = computed(() => filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))
watch(filtered, () => { page.value = 1 })

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.maintenance.list({ status: 'selesai', per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat riwayat maintenance.'
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
      <h2 class="text-sm font-bold text-gray-900">Riwayat Maintenance</h2>
      <p class="text-sm text-gray-500 mt-1">Riwayat maintenance yang sudah selesai beserta biaya pengeluaran.</p>
    </div>

    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="search" placeholder="Cari barang, teknisi, atau jenis…" class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" />
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load"><RefreshCw class="w-4 h-4" /></button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Barang</th>
              <th class="px-5 py-3">Jenis</th>
              <th class="px-5 py-3">Tanggal</th>
              <th class="px-5 py-3">Teknisi</th>
              <th class="px-5 py-3">Biaya</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="m in pagedFiltered" :key="m.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3.5 font-medium text-gray-900">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</td>
              <td class="px-5 py-3.5">
                <span v-if="m.jenisMaintenance" class="text-xs px-2 py-1 rounded bg-violet-50 text-violet-700">{{ m.jenisMaintenance.nama }}</span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-5 py-3.5 text-gray-500">{{ fmt(m.tanggal_jadwal) }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ m.staff?.name ?? m.vendor?.nama ?? '—' }}</td>
              <td class="px-5 py-3.5">
                <span v-if="m.biaya" class="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                  <Receipt class="w-3.5 h-3.5" /> {{ formatRupiah(m.biaya) }}
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td colspan="5" class="px-5 py-12 text-center text-gray-400">
                <Wrench class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ items.length ? 'Tidak ada riwayat yang cocok.' : 'Belum ada maintenance yang selesai.' }}
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
