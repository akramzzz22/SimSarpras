<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Receipt, RefreshCw, Inbox } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'
import { formatRupiah } from '~/utils/format'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Laporan Pengeluaran' })

const admin = useAdminService()

const items = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Kelompokkan maintenance berbiaya per bulan
const monthly = computed(() => {
  const map = new Map<string, { label: string; total: number; count: number }>()
  for (const m of items.value) {
    const biaya = Number(m.biaya) || 0
    if (!m.tanggal_jadwal) continue
    const d = new Date(m.tanggal_jadwal)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    const cur = map.get(key) ?? { label, total: 0, count: 0 }
    cur.total += biaya
    cur.count += 1
    map.set(key, cur)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
})

const grandTotal = computed(() => items.value.reduce((sum, m) => sum + (Number(m.biaya) || 0), 0))
const withBiaya = computed(() => items.value.filter((m) => Number(m.biaya) > 0))

// ---- Pagination: 20 baris per halaman ----
const page = ref(1)
const PER_PAGE = 20
const paged = computed(() => withBiaya.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.maintenance.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data pengeluaran.'
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
        <h2 class="text-sm font-bold text-gray-900">Laporan Pengeluaran</h2>
        <p class="text-sm text-gray-500 mt-1">Biaya pengeluaran maintenance barang per bulan.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load"><RefreshCw class="w-4 h-4" /></button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="bg-gradient-to-r from-red-600 to-red-500 rounded-2xl p-5 text-white shadow-sm">
      <div class="flex items-center gap-2 text-red-100 text-xs font-medium uppercase tracking-wide">
        <Receipt class="w-4 h-4" /> Total Pengeluaran
      </div>
      <div class="text-2xl font-bold mt-1">{{ formatRupiah(grandTotal) }}</div>
    </div>

    <!-- Per bulan -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Pengeluaran per Bulan</div>
      <div class="divide-y divide-gray-50">
        <div v-for="[key, m] in monthly" :key="key" class="flex items-center justify-between px-5 py-3">
          <span class="text-sm font-medium text-gray-700">{{ m.label }}</span>
          <div class="flex items-center gap-4">
            <span class="text-xs text-gray-400">{{ m.count }} transaksi</span>
            <span class="font-semibold text-emerald-700">{{ formatRupiah(m.total) }}</span>
          </div>
        </div>
        <div v-if="!monthly.length && !loading" class="px-5 py-8 text-center text-sm text-gray-400">Belum ada pengeluaran tercatat.</div>
      </div>
    </div>

    <!-- Rincian -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Rincian Pengeluaran</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Barang</th>
              <th class="px-5 py-3">Tanggal</th>
              <th class="px-5 py-3">Teknisi</th>
              <th class="px-5 py-3 text-right">Biaya</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="m in paged" :key="m.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3.5 font-medium text-gray-900">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</td>
              <td class="px-5 py-3.5 text-gray-500">{{ fmt(m.tanggal_jadwal) }}</td>
              <td class="px-5 py-3.5 text-gray-600">{{ m.staff?.name ?? m.vendor?.nama ?? '—' }}</td>
              <td class="px-5 py-3.5 text-right font-semibold text-emerald-700">{{ formatRupiah(m.biaya) }}</td>
            </tr>
            <tr v-if="!withBiaya.length && !loading">
              <td colspan="4" class="px-5 py-12 text-center text-gray-400">
                <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" /> Belum ada pengeluaran dengan biaya.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>

    <Pagination v-model:page="page" :total="withBiaya.length" :per-page="PER_PAGE" label="transaksi" />
  </div>
</template>
