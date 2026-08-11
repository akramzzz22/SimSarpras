<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { AlertTriangle, ArrowLeftRight, QrCode, History, RefreshCw } from 'lucide-vue-next'
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
  <div>
    <!-- Greeting -->
    <div>
      <h2 class="text-sm font-bold" style="color: #0F172A;">Halo, {{ authStore.user?.name ?? 'Murid' }} 👋</h2>
      <p class="text-xs mt-0.5" style="color: #6B7280;">Apa yang ingin Anda lakukan hari ini?</p>
    </div>

    <!-- Quick actions (boxed, konsisten palet) -->
    <div class="grid grid-cols-2 gap-2">
      <NuxtLink
        to="/murid/lapor"
        class="bg-white p-3 transition"
        style="border: 1px solid #D1D5DB; border-radius: 8px;"
      >
        <div class="w-9 h-9 rounded-md flex items-center justify-center" style="background-color: #FEF2F2;">
          <AlertTriangle class="w-4 h-4" style="color: #DC2626;" />
        </div>
        <div class="mt-2 font-semibold text-xs" style="color: #0F172A;">Lapor Kerusakan</div>
        <div class="text-2xs mt-0.5" style="color: #6B7280;">Laporkan barang rusak</div>
      </NuxtLink>

      <NuxtLink
        to="/murid/peminjaman"
        class="bg-white p-3 transition"
        style="border: 1px solid #D1D5DB; border-radius: 8px;"
      >
        <div class="w-9 h-9 rounded-md flex items-center justify-center" style="background-color: #EFF6FF;">
          <ArrowLeftRight class="w-4 h-4" style="color: #1D4ED8;" />
        </div>
        <div class="mt-2 font-semibold text-xs" style="color: #0F172A;">Peminjaman</div>
        <div class="text-2xs mt-0.5" style="color: #6B7280;">Pinjam barang sekolah</div>
      </NuxtLink>

      <NuxtLink
        to="/murid/scan-qr"
        class="bg-white p-3 transition"
        style="border: 1px solid #D1D5DB; border-radius: 8px;"
      >
        <div class="w-9 h-9 rounded-md flex items-center justify-center" style="background-color: #FFFBEB;">
          <QrCode class="w-4 h-4" style="color: #D97706;" />
        </div>
        <div class="mt-2 font-semibold text-xs" style="color: #0F172A;">Scan QR</div>
        <div class="text-2xs mt-0.5" style="color: #6B7280;">Pindai kode barang</div>
      </NuxtLink>

      <NuxtLink
        to="/murid/riwayat"
        class="bg-white p-3 transition"
        style="border: 1px solid #D1D5DB; border-radius: 8px;"
      >
        <div class="w-9 h-9 rounded-md flex items-center justify-center" style="background-color: #F3F4F6;">
          <History class="w-4 h-4" style="color: #374151;" />
        </div>
        <div class="mt-2 font-semibold text-xs" style="color: #0F172A;">Riwayat</div>
        <div class="text-2xs mt-0.5" style="color: #6B7280;">Aktivitas saya</div>
      </NuxtLink>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="px-3 py-2 rounded-md text-xs font-medium"
      style="border: 1px solid #FECACA; background-color: #FEF2F2; color: #DC2626;"
    >{{ error }}</div>

    <!-- Stat cards (boxed) -->
    <div class="grid grid-cols-2 gap-2">
      <div class="bg-white p-3" style="border: 1px solid #D1D5DB; border-radius: 8px;">
        <div class="text-2xs" style="color: #9CA3AF;">Laporan Saya</div>
        <div class="text-xl font-bold mt-0.5" style="color: #0F172A;">{{ myLaporan.length }}</div>
      </div>
      <div class="bg-white p-3" style="border: 1px solid #D1D5DB; border-radius: 8px;">
        <div class="text-2xs" style="color: #9CA3AF;">Peminjaman Saya</div>
        <div class="text-xl font-bold mt-0.5" style="color: #0F172A;">{{ myPeminjaman.length }}</div>
      </div>
    </div>

    <!-- Aktivitas terbaru (boxed) -->
    <div class="bg-white" style="border: 1px solid #D1D5DB; border-radius: 8px; overflow: hidden;">
      <div class="flex items-center justify-between px-3 py-2.5" style="border-bottom: 1px solid #E5E7EB;">
        <h3 class="font-semibold text-xs" style="color: #0F172A;">Aktivitas Terbaru</h3>
        <button class="transition" style="color: #9CA3AF;" title="Muat ulang" @click="load">
          <RefreshCw class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
      <div>
        <div
          v-for="item in [...myLaporan.map((x) => ({ ...x, kind: 'l' })), ...myPeminjaman.map((x) => ({ ...x, kind: 'p' }))].slice(0, 5)"
          :key="item.kind + item.id"
          class="px-3 py-2.5 text-xs flex items-center gap-2"
          style="border-bottom: 1px solid #F3F4F6; color: #6B7280;"
        >
          <div
            class="w-1.5 h-1.5 rounded-full shrink-0"
            :style="{ backgroundColor: item.kind === 'l' ? '#DC2626' : '#1D4ED8' }"
          />
          {{ item.deskripsi ?? `Peminjaman ${item.barang?.nama ?? 'barang'}` }}
        </div>
        <div v-if="!myLaporan.length && !myPeminjaman.length" class="px-3 py-6 text-center text-xs" style="color: #9CA3AF;">
          Belum ada aktivitas.
        </div>
      </div>
    </div>
  </div>
</template>