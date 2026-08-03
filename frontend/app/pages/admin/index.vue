<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  Boxes,
  FileText,
  ClipboardList,
  Wrench,
  Store,
  ArrowUpRight,
  PackageCheck,
  AlertTriangle
} from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Dashboard' })

const authStore = useAuthStore()
const admin = useAdminService()

const stats = ref([
  { label: 'Total Barang', value: 0, icon: Boxes, color: 'bg-blue-500' },
  { label: 'Laporan Kerusakan', value: 0, icon: FileText, color: 'bg-rose-500' },
  { label: 'Peminjaman', value: 0, icon: ClipboardList, color: 'bg-emerald-500' },
  { label: 'Maintenance', value: 0, icon: Wrench, color: 'bg-amber-500' },
  { label: 'Vendor', value: 0, icon: Store, color: 'bg-violet-500' }
])

const laporanTerbaru = ref<any[]>([])
const peminjamanMenunggu = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const [barang, laporan, peminjaman, maintenance, vendor] = await Promise.all([
      admin.barang.list({ per_page: 1 }),
      admin.laporan.list({ per_page: 1 }),
      admin.peminjaman.list({ per_page: 5 }),
      admin.maintenance.list({ per_page: 1 }),
      admin.vendor.list({ per_page: 1 })
    ])

    const values = [barang.total, laporan.total, peminjaman.total, maintenance.total, vendor.total]
    stats.value.forEach((s, i) => {
      s.value = values[i] ?? 0
    })

    laporanTerbaru.value = (await admin.laporan.list({ per_page: 5 })).data
    peminjamanMenunggu.value = (await admin.peminjaman.list({ per_page: 5, status: 'menunggu' })).data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data dashboard.'
  } finally {
    loading.value = false
  }
})

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-100 text-amber-800',
    diverifikasi: 'bg-blue-100 text-blue-800',
    diperbaiki: 'bg-violet-100 text-violet-800',
    selesai: 'bg-emerald-100 text-emerald-800',
    disetujui: 'bg-emerald-100 text-emerald-800',
    ditolak: 'bg-rose-100 text-rose-800',
    dipinjam: 'bg-blue-100 text-blue-800',
    dikembalikan: 'bg-gray-100 text-gray-700',
    terjadwal: 'bg-blue-100 text-blue-800',
    berlangsung: 'bg-amber-100 text-amber-800'
  }
  return map[status] ?? 'bg-gray-100 text-gray-700'
}

const formatTanggal = (d?: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
</script>

<template>
  <div class="space-y-6">
    <!-- Greeting -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Selamat datang, {{ authStore.user?.name ?? 'Admin' }} 👋</h2>
        <p class="text-sm text-gray-500 mt-1">Ringkasan pengelolaan aset sekolah hari ini.</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <div v-for="i in 5" :key="i" class="h-28 rounded-2xl bg-gray-100 animate-pulse" />
    </div>

    <!-- Stat cards -->
    <div v-else class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <div
        v-for="s in stats"
        :key="s.label"
        class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition"
      >
        <div class="flex items-center justify-between">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" :class="s.color">
            <component :is="s.icon" class="w-5 h-5 text-white" />
          </div>
          <ArrowUpRight class="w-4 h-4 text-gray-300" />
        </div>
        <div class="mt-4 text-3xl font-bold text-gray-900">{{ s.value }}</div>
        <div class="text-sm text-gray-500 mt-0.5">{{ s.label }}</div>
      </div>
    </div>

    <!-- Lists -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Laporan terbaru -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <AlertTriangle class="w-4 h-4 text-rose-500" />
          <h3 class="font-semibold text-gray-900">Laporan Kerusakan Terbaru</h3>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="l in laporanTerbaru" :key="l.id" class="px-5 py-3.5 flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ formatTanggal(l.created_at) }}</div>
            </div>
            <span class="text-xs px-2 py-1 rounded-full" :class="statusBadge(l.status)">
              {{ l.status }}
            </span>
          </div>
          <div v-if="!laporanTerbaru.length" class="px-5 py-8 text-center text-sm text-gray-400">
            Belum ada laporan kerusakan.
          </div>
        </div>
      </div>

      <!-- Peminjaman menunggu -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <PackageCheck class="w-4 h-4 text-emerald-500" />
          <h3 class="font-semibold text-gray-900">Peminjaman Menunggu Persetujuan</h3>
        </div>
        <div class="divide-y divide-gray-50">
          <div v-for="p in peminjamanMenunggu" :key="p.id" class="px-5 py-3.5 flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">
                {{ p.peminjam?.name ?? 'User #' + p.peminjam_id }} • {{ formatTanggal(p.tanggal_pinjam) }}
              </div>
            </div>
            <span class="text-xs px-2 py-1 rounded-full" :class="statusBadge(p.status)">
              {{ p.status }}
            </span>
          </div>
          <div v-if="!peminjamanMenunggu.length" class="px-5 py-8 text-center text-sm text-gray-400">
            Tidak ada peminjaman menunggu. 🎉
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
