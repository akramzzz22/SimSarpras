<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { BarChart3, Boxes, AlertTriangle, RefreshCw, Inbox } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'mobile', middleware: ['auth'], title: 'Monitoring' })

const admin = useAdminService()

const loading = ref(false)
const error = ref<string | null>(null)
const barang = ref<any[]>([])
const laporan = ref<any[]>([])

const breakdown = computed(() => {
  const map: Record<string, number> = { aktif: 0, rusak: 0, dipinjam: 0, maintenance: 0 }
  for (const b of barang.value) map[b.status] = (map[b.status] ?? 0) + 1
  return map
})

const maxCount = computed(() => Math.max(...Object.values(breakdown.value), 1))

async function load() {
  loading.value = true
  error.value = null
  try {
    const [b, l] = await Promise.all([
      admin.barang.list({ per_page: 100 }),
      admin.laporan.list({ per_page: 100 })
    ])
    barang.value = b.data
    laporan.value = l.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data.'
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

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-gray-900">Monitoring Aset</h2>
      <button class="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- Breakdown status barang -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h3 class="font-semibold text-gray-900 text-sm mb-4 flex items-center gap-2">
        <BarChart3 class="w-4 h-4 text-blue-600" /> Status Barang
      </h3>
      <div class="space-y-3">
        <div v-for="(count, status) in breakdown" :key="status">
          <div class="flex justify-between text-xs text-gray-600 mb-1">
            <span class="capitalize">{{ status }}</span>
            <span class="font-semibold">{{ count }}</span>
          </div>
          <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="{
                'bg-emerald-500': status === 'aktif',
                'bg-rose-500': status === 'rusak',
                'bg-blue-500': status === 'dipinjam',
                'bg-amber-500': status === 'maintenance'
              }"
              :style="{ width: (count / maxCount) * 100 + '%' }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Laporan terbaru -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <AlertTriangle class="w-4 h-4 text-rose-500" />
        <h3 class="font-semibold text-gray-900 text-sm">Laporan Kerusakan Terbaru</h3>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="l in laporan.slice(0, 6)" :key="l.id" class="px-4 py-3">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
              <div class="text-xs text-gray-400">{{ fmt(l.created_at) }} • {{ l.pelapor?.name ?? 'User' }}</div>
            </div>
            <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="badge(l.status)">{{ l.status }}</span>
          </div>
        </div>
        <div v-if="!laporan.length && !loading" class="px-4 py-8 text-center text-sm text-gray-400">
          <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" /> Belum ada laporan kerusakan.
        </div>
      </div>
    </div>
  </div>
</template>
