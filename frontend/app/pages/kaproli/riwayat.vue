<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { History, AlertTriangle, ArrowLeftRight, RefreshCw, Inbox } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'staff', middleware: ['auth'], title: 'Riwayat' })

const admin = useAdminService()

const laporan = ref<any[]>([])
const peminjaman = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const tab = ref<'laporan' | 'peminjaman'>('peminjaman')

async function load() {
  loading.value = true
  error.value = null
  try {
    const [l, p] = await Promise.all([
      admin.laporan.list({ per_page: 100 }),
      admin.peminjaman.list({ per_page: 100 })
    ])
    laporan.value = l.data
    peminjaman.value = p.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat riwayat.'
  } finally {
    loading.value = false
  }
}

const badge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-100 text-amber-800',
    diverifikasi: 'bg-blue-100 text-blue-800',
    diperbaiki: 'bg-violet-100 text-violet-800',
    selesai: 'bg-emerald-100 text-emerald-800',
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
      <h2 class="text-2xl font-bold text-gray-900">Riwayat</h2>
      <p class="text-sm text-gray-500 mt-1">Riwayat aktivitas aset proli Anda.</p>
    </div>

    <div class="flex gap-2">
      <button
        class="px-4 py-2 rounded-xl text-sm font-medium border transition"
        :class="tab === 'peminjaman' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="tab = 'peminjaman'"
      >
        Peminjaman
      </button>
      <button
        class="px-4 py-2 rounded-xl text-sm font-medium border transition"
        :class="tab === 'laporan' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="tab = 'laporan'"
      >
        Kerusakan
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="space-y-3">
      <template v-if="tab === 'peminjaman'">
        <div v-for="p in peminjaman" :key="p.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <ArrowLeftRight class="w-4 h-4 text-blue-600" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
            <div class="text-xs text-gray-400">{{ fmt(p.created_at) }} • {{ p.peminjam?.name ?? 'User' }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="badge(p.status)">{{ p.status }}</span>
        </div>
        <div v-if="!peminjaman.length && !loading" class="py-10 text-center text-gray-400 text-sm">
          <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" /> Belum ada riwayat peminjaman.
        </div>
      </template>

      <template v-else>
        <div v-for="l in laporan" :key="l.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle class="w-4 h-4 text-rose-500" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
            <div class="text-xs text-gray-400">{{ fmt(l.created_at) }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="badge(l.status)">{{ l.status }}</span>
        </div>
        <div v-if="!laporan.length && !loading" class="py-10 text-center text-gray-400 text-sm">
          <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" /> Belum ada riwayat kerusakan.
        </div>
      </template>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
