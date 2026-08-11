<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { History, AlertTriangle, ArrowLeftRight, RefreshCw, Inbox, FileText } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'
import { fmtJam } from '~/utils/format'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'mobile', middleware: ['auth'], title: 'Riwayat' })

const admin = useAdminService()
const authStore = useAuthStore()

const laporan = ref<any[]>([])
const peminjaman = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const tab = ref<'laporan' | 'peminjaman'>('peminjaman')

const myId = computed(() => authStore.user?.id)
const myLaporan = computed(() => laporan.value.filter((l) => l.pelapor_id === myId.value))
const myPeminjaman = computed(() => peminjaman.value.filter((p) => p.peminjam_id === myId.value))

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

// ---- Pagination: 20 data per halaman (per tab) ----
const page = ref(1)
const PER_PAGE = 20

const pagedPeminjaman = computed(() =>
  myPeminjaman.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

const pagedLaporan = computed(() =>
  myLaporan.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(tab, () => {
  page.value = 1
})

const badge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-50 text-amber-700',
    diverifikasi: 'bg-blue-50 text-blue-700',
    diperbaiki: 'bg-violet-50 text-violet-700',
    selesai: 'bg-emerald-50 text-emerald-700',
    disetujui: 'bg-blue-50 text-blue-700',
    dipinjam: 'bg-violet-50 text-violet-700',
    dikembalikan: 'bg-emerald-50 text-emerald-700',
    ditolak: 'bg-rose-50 text-rose-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold text-gray-900">Riwayat Aktivitas</h2>
      <button class="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        class="px-4 py-2.5 rounded-xl text-sm font-medium border transition"
        :class="tab === 'peminjaman' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="tab = 'peminjaman'"
      >
        Peminjaman
      </button>
      <button
        class="px-4 py-2.5 rounded-xl text-sm font-medium border transition"
        :class="tab === 'laporan' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="tab = 'laporan'"
      >
        Kerusakan
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="space-y-3">
      <template v-if="tab === 'peminjaman'">
        <div v-for="p in pagedPeminjaman" :key="p.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <ArrowLeftRight class="w-4 h-4 text-blue-600" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
            <div class="text-xs text-gray-400">{{ fmt(p.tanggal_pinjam) }} • {{ fmtJam(p.jam_mulai) }} – {{ fmtJam(p.jam_selesai) }}</div>
          </div>
          <div class="flex flex-col items-end gap-1.5 shrink-0">
            <span class="text-xs px-2 py-1 rounded" :class="badge(p.status)">{{ p.status }}</span>
            <NuxtLink
              v-if="['disetujui', 'dipinjam', 'dikembalikan'].includes(p.status)"
              :to="`/surat-peminjaman/${p.id}`"
              class="inline-flex items-center gap-1 text-2xs font-medium text-blue-600 hover:text-blue-700"
            >
              <FileText class="w-3 h-3" />
              Cetak Surat
            </NuxtLink>
          </div>
        </div>
        <div v-if="!myPeminjaman.length && !loading" class="py-10 text-center text-gray-400 text-sm">
          <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" /> Belum ada riwayat peminjaman.
        </div>
      </template>

      <template v-else>
        <div v-for="l in pagedLaporan" :key="l.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle class="w-4 h-4 text-rose-500" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
            <div class="text-xs text-gray-400 line-clamp-1">{{ l.deskripsi }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded shrink-0" :class="badge(l.status)">{{ l.status }}</span>
        </div>
        <div v-if="!myLaporan.length && !loading" class="py-10 text-center text-gray-400 text-sm">
          <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" /> Belum ada riwayat kerusakan.
        </div>
      </template>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

    <!-- Pagination: 20 data per halaman -->
    <Pagination
      v-model:page="page"
      :total="tab === 'peminjaman' ? myPeminjaman.length : myLaporan.length"
      :per-page="PER_PAGE"
      :label="tab === 'peminjaman' ? 'peminjaman' : 'laporan'"
    />
  </div>
</template>
