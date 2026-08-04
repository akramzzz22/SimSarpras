<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { AlertTriangle, RefreshCw, Inbox, Download } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'mobile', middleware: ['auth'], title: 'Laporan' })

const admin = useAdminService()

const laporan = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const filterStatus = ref('all')

const filtered = computed(() =>
  filterStatus.value === 'all' ? laporan.value : laporan.value.filter((l) => l.status === filterStatus.value)
)

const statusOptions = ['all', 'menunggu', 'diverifikasi', 'diperbaiki', 'selesai'] as const

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.laporan.list({ per_page: 100 })
    laporan.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat laporan.'
  } finally {
    loading.value = false
  }
}

const badge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-100 text-amber-800',
    diverifikasi: 'bg-blue-100 text-blue-800',
    diperbaiki: 'bg-violet-100 text-violet-800',
    selesai: 'bg-emerald-100 text-emerald-800'
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

// Export CSV laporan kerusakan (sesuai filter yang sedang aktif)
function exportCSV() {
  const rows: string[][] = [['Barang', 'Deskripsi', 'Pelapor', 'Tanggal', 'Status']]
  filtered.value.forEach((l) =>
    rows.push([l.barang?.nama ?? 'Barang #' + l.barang_id, l.deskripsi ?? '', l.pelapor?.name ?? '', fmt(l.created_at), l.status])
  )

  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-kerusakan-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-gray-900">Laporan Kerusakan</h2>
      <div class="flex gap-2">
        <button
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition"
          @click="exportCSV"
        >
          <Download class="w-3.5 h-3.5" />
          Export CSV
        </button>
        <button class="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
          <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="s in statusOptions"
        :key="s"
        class="px-3 py-1.5 rounded-full text-xs font-medium border transition"
        :class="filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="filterStatus = s"
      >
        {{ s }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="space-y-3">
      <div v-for="l in filtered" :key="l.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="text-sm font-medium text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
            <div class="text-xs text-gray-400">{{ fmt(l.created_at) }} • {{ l.pelapor?.name ?? 'User' }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="badge(l.status)">{{ l.status }}</span>
        </div>
        <p class="mt-2 text-sm text-gray-600 line-clamp-2">{{ l.deskripsi }}</p>
      </div>

      <div v-if="!filtered.length && !loading" class="py-12 text-center text-gray-400 text-sm">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" /> Belum ada laporan kerusakan.
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
