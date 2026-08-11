<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Boxes, FolderTree, MapPin, RefreshCw } from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Laporan Inventaris' })

const admin = useAdminService()

const items = ref<Barang[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const counts = computed(() => {
  const byStatus = new Map<string, number>()
  const byKategori = new Map<string, number>()
  const byRuangan = new Map<string, number>()
  for (const b of items.value) {
    byStatus.set(b.status, (byStatus.get(b.status) ?? 0) + 1)
    byKategori.set(b.kategori?.nama ?? 'Tanpa kategori', (byKategori.get(b.kategori?.nama ?? 'Tanpa kategori') ?? 0) + 1)
    byRuangan.set(b.ruangan?.nama ?? 'Tanpa ruangan', (byRuangan.get(b.ruangan?.nama ?? 'Tanpa ruangan') ?? 0) + 1)
  }
  return {
    total: items.value.length,
    sarpras: items.value.filter((b) => b.owner_type === 'sarpras').length,
    proli: items.value.filter((b) => b.owner_type === 'proli').length,
    byStatus: [...byStatus.entries()].sort((a, b) => b[1] - a[1]),
    byKategori: [...byKategori.entries()].sort((a, b) => b[1] - a[1]),
    byRuangan: [...byRuangan.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }
})

const statusColor = (s: string) => ({
  aktif: 'bg-emerald-50 text-emerald-700',
  rusak: 'bg-rose-50 text-rose-700',
  dipinjam: 'bg-red-50 text-red-700',
  maintenance: 'bg-amber-50 text-amber-700'
})[s as 'aktif'] ?? 'bg-gray-50 text-gray-700'

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.barang.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data inventaris.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Laporan Inventaris</h2>
        <p class="text-sm text-gray-500 mt-1">Rekapitulasi barang berdasarkan status, kategori, dan lokasi.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load"><RefreshCw class="w-4 h-4" /></button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- Stat utama -->
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide"><Boxes class="w-4 h-4" /> Total Barang</div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ counts.total }}</div>
      </div>
      <div class="bg-red-50 rounded-2xl border border-red-100 p-4">
        <div class="flex items-center gap-2 text-red-600 text-xs font-medium uppercase tracking-wide"><Boxes class="w-4 h-4" /> Sarpras</div>
        <div class="text-2xl font-bold text-red-700 mt-1">{{ counts.sarpras }}</div>
      </div>
      <div class="bg-violet-50 rounded-2xl border border-violet-100 p-4">
        <div class="flex items-center gap-2 text-violet-600 text-xs font-medium uppercase tracking-wide"><Boxes class="w-4 h-4" /> Proli</div>
        <div class="text-2xl font-bold text-violet-700 mt-1">{{ counts.proli }}</div>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <!-- Per status -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Per Status</div>
        <div class="divide-y divide-gray-50">
          <div v-for="[s, n] in counts.byStatus" :key="s" class="flex items-center justify-between px-5 py-3">
            <span class="text-xs px-2 py-1 rounded" :class="statusColor(s)">{{ s }}</span>
            <span class="font-semibold text-gray-800">{{ n }}</span>
          </div>
          <div v-if="!counts.byStatus.length && !loading" class="px-5 py-8 text-center text-sm text-gray-400">Belum ada data.</div>
        </div>
      </div>

      <!-- Per kategori -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2 font-semibold text-gray-900"><FolderTree class="w-4 h-4 text-red-600" /> Per Kategori</div>
        <div class="divide-y divide-gray-50">
          <div v-for="[s, n] in counts.byKategori" :key="s" class="flex items-center justify-between px-5 py-3">
            <span class="text-sm text-gray-700">{{ s }}</span>
            <span class="font-semibold text-gray-800">{{ n }}</span>
          </div>
          <div v-if="!counts.byKategori.length && !loading" class="px-5 py-8 text-center text-sm text-gray-400">Belum ada data.</div>
        </div>
      </div>
    </div>

    <!-- Per ruangan -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2 font-semibold text-gray-900"><MapPin class="w-4 h-4 text-red-600" /> Per Lokasi (Ruangan)</div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-50">
        <div v-for="[s, n] in counts.byRuangan" :key="s" class="bg-white px-5 py-3 flex items-center justify-between">
          <span class="text-sm text-gray-700 truncate">{{ s }}</span>
          <span class="font-semibold text-gray-800 ml-2">{{ n }}</span>
        </div>
      </div>
      <div v-if="!counts.byRuangan.length && !loading" class="px-5 py-8 text-center text-sm text-gray-400">Belum ada data.</div>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
