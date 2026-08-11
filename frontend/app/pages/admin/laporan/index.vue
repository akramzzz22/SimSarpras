<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { FileText, AlertTriangle, ArrowLeftRight, Wrench, Loader2, RefreshCw, Download } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Laporan' })

const admin = useAdminService()

const loading = ref(true)
const error = ref<string | null>(null)

const laporan = ref<any[]>([])
const peminjaman = ref<any[]>([])
const maintenance = ref<any[]>([])

// Filter jenis peminjaman: Semua / Pembelajaran / Eskul
const filterJenisPinjam = ref<'all' | 'pembelajaran' | 'eskul'>('all')

const summary = computed(() => ({
  laporanMenunggu: laporan.value.filter((l) => l.status === 'menunggu').length,
  laporanSelesai: laporan.value.filter((l) => l.status === 'selesai').length,
  peminjamanAktif: peminjaman.value.filter((p) => ['menunggu', 'disetujui', 'dipinjam'].includes(p.status)).length,
  maintenanceAktif: maintenance.value.filter((m) => ['terjadwal', 'berlangsung'].includes(m.status)).length
}))

// ---- Pagination: gabungkan semua aktivitas jadi satu daftar, 20 baris per halaman ----
type AktivitasRow = {
  jenis: 'Kerusakan' | 'Peminjaman' | 'Maintenance'
  id: number
  nama: string
  tanggal: string
  status: string
  jenisPinjam?: 'pembelajaran' | 'eskul'
}

const page = ref(1)
const PER_PAGE = 20

const aktivitas = computed<AktivitasRow[]>(() => [
  ...laporan.value.map((l) => ({
    jenis: 'Kerusakan' as const,
    id: l.id,
    nama: l.barang?.nama ?? 'Barang #' + l.barang_id,
    tanggal: fmt(l.created_at),
    status: l.status
  })),
  ...peminjaman.value
    .filter((p) =>
      filterJenisPinjam.value === 'all' || (p.jenis ?? 'pembelajaran') === filterJenisPinjam.value
    )
    .map((p) => ({
      jenis: 'Peminjaman' as const,
      id: p.id,
      nama: p.barang?.nama ?? 'Barang #' + p.barang_id,
      tanggal: fmt(p.created_at),
      status: p.status,
      jenisPinjam: (p.jenis ?? 'pembelajaran') as 'pembelajaran' | 'eskul'
    })),
  ...maintenance.value.map((m) => ({
    jenis: 'Maintenance' as const,
    id: m.id,
    nama: m.barang?.nama ?? 'Barang #' + m.barang_id,
    tanggal: fmt(m.tanggal_jadwal),
    status: m.status
  }))
])

const pagedAktivitas = computed(() =>
  aktivitas.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [l, p, m] = await Promise.all([
      admin.laporan.list({ per_page: 100 }),
      admin.peminjaman.list({ per_page: 100 }),
      admin.maintenance.list({ per_page: 100 })
    ])
    laporan.value = l.data
    peminjaman.value = p.data
    maintenance.value = m.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat laporan.'
  } finally {
    loading.value = false
  }
}

const badge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-50 text-amber-700',
    diverifikasi: 'bg-red-50 text-red-700',
    diperbaiki: 'bg-violet-50 text-violet-700',
    selesai: 'bg-emerald-50 text-emerald-700',
    disetujui: 'bg-red-50 text-red-700',
    ditolak: 'bg-rose-50 text-rose-700',
    dipinjam: 'bg-violet-50 text-violet-700',
    dikembalikan: 'bg-emerald-50 text-emerald-700',
    terjadwal: 'bg-amber-50 text-amber-700',
    berlangsung: 'bg-red-50 text-red-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

// Export CSV dari seluruh aktivitas (kerusakan, peminjaman, maintenance)
function exportCSV() {
  const rows: string[][] = [['Jenis', 'Deskripsi', 'Tanggal', 'Status', 'Kategori Peminjaman']]
  laporan.value.forEach((l) => rows.push(['Kerusakan', l.barang?.nama ?? 'Barang #' + l.barang_id, fmt(l.created_at), l.status, '-']))
  peminjaman.value.forEach((p) => rows.push(['Peminjaman', p.barang?.nama ?? 'Barang #' + p.barang_id, fmt(p.created_at), p.status, p.jenis === 'eskul' ? 'Eskul / Kegiatan' : 'Pembelajaran']))
  maintenance.value.forEach((m) => rows.push(['Maintenance', m.barang?.nama ?? 'Barang #' + m.barang_id, fmt(m.tanggal_jadwal), m.status, '-']))

  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-aset-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Laporan</h2>
        <p class="text-sm text-gray-500 mt-1">Rekapitulasi aktivitas sistem aset sekolah.</p>
      </div>
      <div class="flex gap-2">
        <button
          class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition w-fit"
          @click="exportCSV"
        >
          <Download class="w-4 h-4" />
          Export CSV
        </button>
        <button class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition w-fit" @click="load">
          <RefreshCw class="w-4 h-4" />
          Muat Ulang
        </button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- Filter peminjaman by jenis -->
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-gray-500">Jenis Peminjaman:</span>
      <select
        v-model="filterJenisPinjam"
        class="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500"
      >
        <option value="all">Semua</option>
        <option value="pembelajaran">Pembelajaran</option>
      </select>
    </div>

    <!-- Ringkasan -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-amber-50 rounded-2xl border border-amber-100 p-4">
        <div class="flex items-center gap-2 text-amber-600 text-xs font-medium uppercase tracking-wide">
          <AlertTriangle class="w-4 h-4" /> Kerusakan Menunggu
        </div>
        <div class="text-2xl font-bold text-amber-700 mt-1">{{ summary.laporanMenunggu }}</div>
      </div>
      <div class="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
        <div class="flex items-center gap-2 text-emerald-600 text-xs font-medium uppercase tracking-wide">
          <Wrench class="w-4 h-4" /> Kerusakan Selesai
        </div>
        <div class="text-2xl font-bold text-emerald-700 mt-1">{{ summary.laporanSelesai }}</div>
      </div>
      <div class="bg-red-50 rounded-2xl border border-red-100 p-4">
        <div class="flex items-center gap-2 text-red-600 text-xs font-medium uppercase tracking-wide">
          <ArrowLeftRight class="w-4 h-4" /> Peminjaman Aktif
        </div>
        <div class="text-2xl font-bold text-red-700 mt-1">{{ summary.peminjamanAktif }}</div>
      </div>
      <div class="bg-violet-50 rounded-2xl border border-violet-100 p-4">
        <div class="flex items-center gap-2 text-violet-600 text-xs font-medium uppercase tracking-wide">
          <FileText class="w-4 h-4" /> Maintenance Aktif
        </div>
        <div class="text-2xl font-bold text-violet-700 mt-1">{{ summary.maintenanceAktif }}</div>
      </div>
    </div>

    <!-- Tabel ringkasan -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <FileText class="w-4 h-4 text-red-600" />
        <h3 class="font-semibold text-gray-900">Aktivitas Terbaru</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Jenis</th>
              <th class="px-5 py-3">Deskripsi</th>
              <th class="px-5 py-3">Tanggal</th>
              <th class="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="a in pagedAktivitas" :key="a.jenis + a.id" class="hover:bg-gray-50/50">
              <td class="px-5 py-3">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs px-2 py-1 rounded" :class="a.jenis === 'Kerusakan' ? 'bg-rose-50 text-rose-700' : a.jenis === 'Peminjaman' ? 'bg-red-50 text-red-700' : 'bg-violet-50 text-violet-700'">{{ a.jenis }}</span>
                  <span
                    v-if="a.jenis === 'Peminjaman'"
                    class="text-2xs px-1.5 py-0.5 rounded"
                    :class="a.jenisPinjam === 'eskul' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'"
                  >{{ a.jenisPinjam === 'eskul' ? 'Eskul' : 'Pembelajaran' }}</span>
                </div>
              </td>
              <td class="px-5 py-3 text-gray-800">{{ a.nama }}</td>
              <td class="px-5 py-3 text-gray-500">{{ a.tanggal }}</td>
              <td class="px-5 py-3"><span class="text-xs px-2 py-1 rounded" :class="badge(a.status)">{{ a.status }}</span></td>
            </tr>
            <tr v-if="!aktivitas.length && !loading">
              <td colspan="4" class="px-5 py-12 text-center text-gray-400">Belum ada aktivitas.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
        <Loader2 class="w-4 h-4 animate-spin" /> Memuat data…
      </div>
    </div>

    <!-- Pagination: 20 baris per halaman -->
    <Pagination v-model:page="page" :total="aktivitas.length" :per-page="PER_PAGE" label="aktivitas" />
  </div>
</template>
