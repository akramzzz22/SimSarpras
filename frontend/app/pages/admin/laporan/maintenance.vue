<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Wrench, RefreshCw } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'
import { formatRupiah } from '~/utils/format'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Laporan Maintenance' })

const admin = useAdminService()

const items = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const counts = computed(() => {
  const byStatus = new Map<string, number>()
  const byJenis = new Map<string, number>()
  for (const m of items.value) {
    byStatus.set(m.status, (byStatus.get(m.status) ?? 0) + 1)
    byJenis.set(m.jenisMaintenance?.nama ?? 'Lainnya', (byJenis.get(m.jenisMaintenance?.nama ?? 'Lainnya') ?? 0) + 1)
  }
  return {
    total: items.value.length,
    berlangsung: items.value.filter((m) => m.status === 'berlangsung').length,
    selesai: items.value.filter((m) => m.status === 'selesai').length,
    totalBiaya: items.value.reduce((sum, m) => sum + (Number(m.biaya) || 0), 0),
    byStatus: [...byStatus.entries()].sort((a, b) => b[1] - a[1]),
    byJenis: [...byJenis.entries()].sort((a, b) => b[1] - a[1])
  }
})

const badge = (s: string) => ({
  terjadwal: 'bg-amber-50 text-amber-700',
  berlangsung: 'bg-red-50 text-red-700',
  selesai: 'bg-emerald-50 text-emerald-700'
})[s as 'terjadwal'] ?? 'bg-gray-50 text-gray-700'

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.maintenance.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data maintenance.'
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
        <h2 class="text-sm font-bold text-gray-900">Laporan Maintenance</h2>
        <p class="text-sm text-gray-500 mt-1">Rekapitulasi kegiatan maintenance berdasarkan status dan jenis.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load"><RefreshCw class="w-4 h-4" /></button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide"><Wrench class="w-4 h-4" /> Total</div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ counts.total }}</div>
      </div>
      <div class="bg-amber-50 rounded-2xl border border-amber-100 p-4">
        <div class="flex items-center gap-2 text-amber-600 text-xs font-medium uppercase tracking-wide"><Wrench class="w-4 h-4" /> Terjadwal</div>
        <div class="text-2xl font-bold text-amber-700 mt-1">{{ counts.byStatus.find(([s]) => s === 'terjadwal')?.[1] ?? 0 }}</div>
      </div>
      <div class="bg-red-50 rounded-2xl border border-red-100 p-4">
        <div class="flex items-center gap-2 text-red-600 text-xs font-medium uppercase tracking-wide"><Wrench class="w-4 h-4" /> Berlangsung</div>
        <div class="text-2xl font-bold text-red-700 mt-1">{{ counts.berlangsung }}</div>
      </div>
      <div class="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
        <div class="flex items-center gap-2 text-emerald-600 text-xs font-medium uppercase tracking-wide"><Wrench class="w-4 h-4" /> Selesai</div>
        <div class="text-2xl font-bold text-emerald-700 mt-1">{{ counts.selesai }}</div>
      </div>
    </div>

    <div class="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-5 text-white shadow-sm">
      <div class="text-emerald-100 text-xs font-medium uppercase tracking-wide">Total Biaya Maintenance</div>
      <div class="text-2xl font-bold mt-1">{{ formatRupiah(counts.totalBiaya) }}</div>
    </div>

    <div class="grid md:grid-cols-2 gap-4">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Per Status</div>
        <div class="divide-y divide-gray-50">
          <div v-for="[s, n] in counts.byStatus" :key="s" class="flex items-center justify-between px-5 py-3">
            <span class="text-xs px-2 py-1 rounded" :class="badge(s)">{{ s }}</span>
            <span class="font-semibold text-gray-800">{{ n }}</span>
          </div>
          <div v-if="!counts.byStatus.length && !loading" class="px-5 py-8 text-center text-sm text-gray-400">Belum ada data.</div>
        </div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Per Jenis Maintenance</div>
        <div class="divide-y divide-gray-50">
          <div v-for="[s, n] in counts.byJenis" :key="s" class="flex items-center justify-between px-5 py-3">
            <span class="text-sm text-gray-700">{{ s }}</span>
            <span class="font-semibold text-gray-800">{{ n }}</span>
          </div>
          <div v-if="!counts.byJenis.length && !loading" class="px-5 py-8 text-center text-sm text-gray-400">Belum ada data.</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
