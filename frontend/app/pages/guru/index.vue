<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { AlertTriangle, ArrowLeftRight, QrCode, RefreshCw, History } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'mobile', middleware: ['auth'], title: 'Beranda' })

const admin = useAdminService()
const authStore = useAuthStore()

const loading = ref(false)
const laporan = ref<any[]>([])
const peminjaman = ref<any[]>([])
const error = ref<string | null>(null)

const myId = computed(() => authStore.user?.id)

const myLaporan = computed(() => laporan.value.filter((l) => l.pelapor_id === myId.value))
const myPeminjaman = computed(() => peminjaman.value.filter((p) => p.peminjam_id === myId.value))

async function load() {
  loading.value = true
  error.value = null
  try {
    const [l, p] = await Promise.all([
      admin.laporan.list({ per_page: 50 }),
      admin.peminjaman.list({ per_page: 50 })
    ])
    laporan.value = l.data
    peminjaman.value = p.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-xl font-bold text-gray-900">Halo, {{ authStore.user?.name ?? 'Guru' }} 👋</h2>
      <p class="text-sm text-gray-500 mt-0.5">Apa yang ingin Anda lakukan hari ini?</p>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-2 gap-3">
      <NuxtLink to="/guru/lapor-kerusakan" class="bg-rose-50 rounded-2xl border border-rose-100 p-4 flex flex-col items-start gap-2 hover:shadow-md transition">
        <div class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center"><AlertTriangle class="w-5 h-5 text-rose-600" /></div>
        <div class="font-semibold text-sm text-gray-900">Lapor Kerusakan</div>
        <div class="text-xs text-gray-500">Laporkan barang rusak</div>
      </NuxtLink>
      <NuxtLink to="/guru/peminjaman" class="bg-blue-50 rounded-2xl border border-blue-100 p-4 flex flex-col items-start gap-2 hover:shadow-md transition">
        <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><ArrowLeftRight class="w-5 h-5 text-blue-600" /></div>
        <div class="font-semibold text-sm text-gray-900">Peminjaman</div>
        <div class="text-xs text-gray-500">Pinjam barang sekolah</div>
      </NuxtLink>
      <NuxtLink to="/guru/scan-qr" class="bg-violet-50 rounded-2xl border border-violet-100 p-4 flex flex-col items-start gap-2 hover:shadow-md transition">
        <div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><QrCode class="w-5 h-5 text-violet-600" /></div>
        <div class="font-semibold text-sm text-gray-900">Scan QR</div>
        <div class="text-xs text-gray-500">Pindai kode barang</div>
      </NuxtLink>
      <NuxtLink to="/guru/riwayat" class="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 flex flex-col items-start gap-2 hover:shadow-md transition">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><History class="w-5 h-5 text-emerald-600" /></div>
        <div class="font-semibold text-sm text-gray-900">Riwayat</div>
        <div class="text-xs text-gray-500">Aktivitas saya</div>
      </NuxtLink>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- Ringkasan -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="text-xs text-gray-400">Laporan Saya</div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ myLaporan.length }}</div>
      </div>
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="text-xs text-gray-400">Peminjaman Saya</div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ myPeminjaman.length }}</div>
      </div>
    </div>

    <!-- Aktivitas terbaru -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900 text-sm">Aktivitas Terbaru</h3>
        <button class="text-gray-400 hover:text-gray-600" title="Muat ulang" @click="load">
          <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="item in [...myLaporan.map((x) => ({ ...x, kind: 'l' })), ...myPeminjaman.map((x) => ({ ...x, kind: 'p' }))].slice(0, 5)" :key="item.kind + item.id" class="px-4 py-3 text-sm text-gray-600">
          {{ item.deskripsi ?? `Peminjaman ${item.barang?.nama ?? 'barang'}` }}
        </div>
        <div v-if="!myLaporan.length && !myPeminjaman.length" class="px-4 py-8 text-center text-sm text-gray-400">
          Belum ada aktivitas.
        </div>
      </div>
    </div>
  </div>
</template>
