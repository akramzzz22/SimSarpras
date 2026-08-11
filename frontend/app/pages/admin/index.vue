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
  { label: 'Total Barang', value: 0, icon: Boxes, color: 'bg-red-500' },
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
    menunggu: 'bg-amber-50 text-amber-700',
    diverifikasi: 'bg-red-50 text-red-700',
    diperbaiki: 'bg-violet-50 text-violet-700',
    selesai: 'bg-emerald-50 text-emerald-700',
    disetujui: 'bg-emerald-50 text-emerald-700',
    ditolak: 'bg-rose-50 text-rose-700',
    dipinjam: 'bg-red-50 text-red-700',
    dikembalikan: 'bg-gray-50 text-gray-700',
    terjadwal: 'bg-red-50 text-red-700',
    berlangsung: 'bg-amber-50 text-amber-700'
  }
  return map[status] ?? 'bg-gray-50 text-gray-700'
}

const formatTanggal = (d?: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
</script>

<template>
  <div class="space-y-6">
    <!-- Greeting -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Selamat datang, {{ authStore.user?.name ?? 'Admin' }} 👋</h2>
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

    <!-- Stat cards boxed -->
    <div v-else class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <div
        v-for="s in stats"
        :key="s.label"
        class="bg-white p-5 transition"
        style="border: 1px solid #D1D5DB; border-radius: 8px;"
      >
        <div class="flex items-center justify-between">
          <div class="w-11 h-11 rounded-lg flex items-center justify-center" :class="s.color">
            <component :is="s.icon" class="w-5 h-5 text-white" />
          </div>
          <ArrowUpRight class="w-4 h-4" style="color: #D1D5DB;" />
        </div>
        <div class="mt-4 text-3xl font-bold" style="color: #0F172A;">{{ s.value }}</div>
        <div class="text-sm mt-0.5" style="color: #6B7280;">{{ s.label }}</div>
      </div>
    </div>

    <!-- Lists boxed -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Laporan terbaru -->
      <div class="bg-white" style="border: 1px solid #D1D5DB; border-radius: 8px; overflow: hidden;">
        <div class="px-5 py-4 flex items-center gap-2" style="border-bottom: 1px solid #E5E7EB;">
          <AlertTriangle class="w-4 h-4" style="color: #D97706;" />
          <h3 class="font-semibold" style="color: #0F172A;">Laporan Kerusakan Terbaru</h3>
        </div>
        <div>
          <div v-for="l in laporanTerbaru" :key="l.id" class="px-5 py-3.5 flex items-center gap-3" style="border-bottom: 1px solid #E5E7EB;">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium" style="color: #0F172A;">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
              <div class="text-xs mt-0.5" style="color: #6B7280;">{{ formatTanggal(l.created_at) }}</div>
            </div>
            <span class="text-xs px-2 py-1 rounded" :class="statusBadge(l.status)">
              {{ l.status }}
            </span>
          </div>
          <div v-if="!laporanTerbaru.length" class="px-5 py-8 text-center text-sm" style="color: #9CA3AF;">
            Belum ada laporan kerusakan.
          </div>
        </div>
      </div>

      <!-- Peminjaman menunggu -->
      <div class="bg-white" style="border: 1px solid #D1D5DB; border-radius: 8px; overflow: hidden;">
        <div class="px-5 py-4 flex items-center gap-2" style="border-bottom: 1px solid #E5E7EB;">
          <PackageCheck class="w-4 h-4" style="color: #1D4ED8;" />
          <h3 class="font-semibold" style="color: #0F172A;">Peminjaman Menunggu Persetujuan</h3>
        </div>
        <div>
          <div v-for="p in peminjamanMenunggu" :key="p.id" class="px-5 py-3.5 flex items-center gap-3" style="border-bottom: 1px solid #E5E7EB;">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium" style="color: #0F172A;">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
              <div class="text-xs mt-0.5" style="color: #6B7280;">
                {{ p.peminjam?.name ?? 'User #' + p.peminjam_id }} • {{ formatTanggal(p.tanggal_pinjam) }}
              </div>
            </div>
            <span class="text-xs px-2 py-1 rounded" :class="statusBadge(p.status)">
              {{ p.status }}
            </span>
          </div>
          <div v-if="!peminjamanMenunggu.length" class="px-5 py-8 text-center text-sm" style="color: #9CA3AF;">
            Tidak ada peminjaman menunggu. 🎉
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
