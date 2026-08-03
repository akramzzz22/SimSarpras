<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Boxes, ArrowLeftRight, RefreshCw, AlertTriangle, ClipboardCheck } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'staff', middleware: ['auth'], title: 'Dashboard' })

const admin = useAdminService()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref<string | null>(null)
const barang = ref<any[]>([])
const peminjaman = ref<any[]>([])
const laporan = ref<any[]>([])

const stats = computed(() => ({
  barangProli: barang.value.filter((b) => b.owner_type === 'proli').length,
  barangAktif: barang.value.filter((b) => b.owner_type === 'proli' && b.status === 'aktif').length,
  peminjamanMenunggu: peminjaman.value.filter((p) => p.status === 'menunggu').length,
  laporanMenunggu: laporan.value.filter((l) => l.status === 'menunggu').length
}))

const pendingPeminjaman = computed(() => peminjaman.value.filter((p) => p.status === 'menunggu'))

async function load() {
  loading.value = true
  error.value = null
  try {
    const [b, p, l] = await Promise.all([
      admin.barang.list({ per_page: 100 }),
      admin.peminjaman.list({ per_page: 100 }),
      admin.laporan.list({ per_page: 100 })
    ])
    barang.value = b.data
    peminjaman.value = p.data
    laporan.value = l.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat dashboard.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Selamat datang, {{ authStore.user?.name ?? 'Ketua Proli' }} 👋</h2>
        <p class="text-sm text-gray-500 mt-1">Ringkasan aset proli dan persetujuan yang menunggu.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="flex items-center gap-2 text-gray-400 text-xs font-medium uppercase tracking-wide"><Boxes class="w-4 h-4" /> Barang Proli</div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ stats.barangProli }}</div>
      </div>
      <div class="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
        <div class="flex items-center gap-2 text-emerald-500 text-xs font-medium uppercase tracking-wide"><Boxes class="w-4 h-4" /> Barang Aktif</div>
        <div class="text-2xl font-bold text-emerald-700 mt-1">{{ stats.barangAktif }}</div>
      </div>
      <div class="bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <div class="flex items-center gap-2 text-blue-500 text-xs font-medium uppercase tracking-wide"><ArrowLeftRight class="w-4 h-4" /> Peminjaman Menunggu</div>
        <div class="text-2xl font-bold text-blue-700 mt-1">{{ stats.peminjamanMenunggu }}</div>
      </div>
      <div class="bg-amber-50 rounded-2xl border border-amber-100 p-4">
        <div class="flex items-center gap-2 text-amber-500 text-xs font-medium uppercase tracking-wide"><AlertTriangle class="w-4 h-4" /> Laporan Menunggu</div>
        <div class="text-2xl font-bold text-amber-700 mt-1">{{ stats.laporanMenunggu }}</div>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <ClipboardCheck class="w-4 h-4 text-blue-600" />
        <h3 class="font-semibold text-gray-900">Peminjaman Menunggu Persetujuan</h3>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="p in pendingPeminjaman" :key="p.id" class="px-5 py-3.5 flex items-center gap-3">
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
            <div class="text-xs text-gray-400">oleh {{ p.peminjam?.name ?? 'User' }}</div>
          </div>
          <NuxtLink to="/kaproli/approval" class="text-xs font-semibold text-blue-600 hover:text-blue-700 shrink-0">Tinjau →</NuxtLink>
        </div>
        <div v-if="!pendingPeminjaman.length" class="px-5 py-8 text-center text-sm text-gray-400">Tidak ada peminjaman menunggu.</div>
      </div>
    </div>
  </div>
</template>
