<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ArrowLeftRight, RefreshCw, Inbox } from 'lucide-vue-next'
import { useAdminService, type Peminjaman } from '~/services/api/admin'

definePageMeta({ layout: 'staff', middleware: ['auth'], title: 'Peminjaman' })

const admin = useAdminService()

const items = ref<Peminjaman[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const filterStatus = ref('all')

const filtered = computed(() =>
  filterStatus.value === 'all' ? items.value : items.value.filter((p) => p.status === filterStatus.value)
)

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
    menunggu: 'bg-amber-100 text-amber-800',
    disetujui: 'bg-blue-100 text-blue-800',
    dipinjam: 'bg-violet-100 text-violet-800',
    dikembalikan: 'bg-emerald-100 text-emerald-800',
    ditolak: 'bg-rose-100 text-rose-800'
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Peminjaman</h2>
      <p class="text-sm text-gray-500 mt-1">Daftar seluruh peminjaman barang proli.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="s in statusOptions"
        :key="s"
        class="px-3 py-1.5 rounded-full text-sm font-medium border transition"
        :class="filterStatus === s ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="filterStatus = s"
      >
        {{ s }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="p in filtered" :key="p.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
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
          <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="badge(p.status)">{{ p.status }}</span>
        </div>
        <div class="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Tanggal: <b class="text-gray-700">{{ fmt(p.tanggal_pinjam) }}</b></span>
          <span>Jam: <b class="text-gray-700">ke-{{ p.jam_mulai }} – {{ p.jam_selesai }}</b></span>
        </div>
      </div>

      <div v-if="!filtered.length && !loading" class="md:col-span-2 py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">{{ items.length ? 'Tidak ada peminjaman dengan status ini.' : 'Belum ada data peminjaman.' }}</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
