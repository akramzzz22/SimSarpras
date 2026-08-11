<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Wrench, CalendarClock, Play, CheckCircle2, RefreshCw, TrendingUp, Clock, AlertTriangle } from 'lucide-vue-next'
import { useAdminService, type Maintenance } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Dashboard Maintenance' })

const admin = useAdminService()

const items = ref<Maintenance[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const counts = computed(() => ({
  total: items.value.length,
  terjadwal: items.value.filter((m) => m.status === 'terjadwal').length,
  berlangsung: items.value.filter((m) => m.status === 'berlangsung').length,
  selesai: items.value.filter((m) => m.status === 'selesai').length,
  biayaTotal: items.value.reduce((sum, m) => sum + (Number(m.biaya) || 0), 0)
}))

// Jadwal 7 hari ke depan
const upcoming = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  return items.value
    .filter((m) => m.tanggal_jadwal >= today && m.tanggal_jadwal <= end && m.status !== 'selesai')
    .sort((a, b) => a.tanggal_jadwal.localeCompare(b.tanggal_jadwal))
    .slice(0, 8)
})

const statusBadge = (s: string) => ({
  terjadwal: 'bg-amber-50 text-amber-700',
  berlangsung: 'bg-red-50 text-red-700',
  selesai: 'bg-emerald-50 text-emerald-700'
})[s as 'terjadwal'] ?? 'bg-gray-50 text-gray-700'

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : '-')
const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

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
        <h2 class="text-sm font-bold text-gray-900">Dashboard Maintenance</h2>
        <p class="text-sm text-gray-500 mt-1">Ringkasan kegiatan maintenance berkala barang sekolah.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide">
          <Wrench class="w-4 h-4" /> Total Jadwal
        </div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ counts.total }}</div>
      </div>
      <div class="bg-amber-50 rounded-2xl border border-amber-100 p-4">
        <div class="flex items-center gap-2 text-amber-600 text-xs font-medium uppercase tracking-wide">
          <Clock class="w-4 h-4" /> Terjadwal
        </div>
        <div class="text-2xl font-bold text-amber-700 mt-1">{{ counts.terjadwal }}</div>
      </div>
      <div class="bg-red-50 rounded-2xl border border-red-100 p-4">
        <div class="flex items-center gap-2 text-red-600 text-xs font-medium uppercase tracking-wide">
          <Play class="w-4 h-4" /> Berlangsung
        </div>
        <div class="text-2xl font-bold text-red-700 mt-1">{{ counts.berlangsung }}</div>
      </div>
      <div class="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
        <div class="flex items-center gap-2 text-emerald-600 text-xs font-medium uppercase tracking-wide">
          <CheckCircle2 class="w-4 h-4" /> Selesai
        </div>
        <div class="text-2xl font-bold text-emerald-700 mt-1">{{ counts.selesai }}</div>
      </div>
    </div>

    <!-- Total biaya -->
    <div class="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-5 text-white shadow-sm">
      <div class="flex items-center gap-2 text-red-100 text-xs font-medium uppercase tracking-wide">
        <TrendingUp class="w-4 h-4" /> Total Biaya Pengeluaran Maintenance
      </div>
      <div class="text-2xl font-bold mt-1">{{ rupiah(counts.biayaTotal) }}</div>
    </div>

    <!-- Jadwal 7 hari ke depan -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <CalendarClock class="w-4 h-4 text-red-600" />
        <h3 class="font-semibold text-gray-900">Jadwal 7 Hari ke Depan</h3>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="m in upcoming" :key="m.id" class="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition">
          <div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
            <Wrench class="w-4 h-4 text-red-600" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium text-gray-900 truncate">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</div>
            <div class="text-xs text-gray-400">{{ fmt(m.tanggal_jadwal) }} • {{ m.staff?.name ?? m.vendor?.nama ?? 'Belum ada penanggung jawab' }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded shrink-0" :class="statusBadge(m.status)">{{ m.status }}</span>
        </div>
        <div v-if="!upcoming.length && !loading" class="px-5 py-10 text-center text-sm text-gray-400">
          <CalendarClock class="w-8 h-8 mx-auto mb-2 text-gray-300" />
          Tidak ada jadwal maintenance dalam 7 hari ke depan.
        </div>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>

    <!-- Peringatan terlambat -->
    <div v-if="counts.berlangsung === 0 && counts.terjadwal === 0 && !loading" class="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
      <AlertTriangle class="w-4 h-4" /> Belum ada jadwal maintenance. Buat jadwal di menu <strong>Jadwal</strong>.
    </div>
  </div>
</template>
