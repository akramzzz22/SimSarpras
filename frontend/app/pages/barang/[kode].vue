<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ShieldCheck,
  Package,
  QrCode,
  MapPin,
  Tag,
  Building2,
  Landmark,
  Calendar,
  Users,
  AlertTriangle,
  ArrowLeftRight,
  LogIn,
  Loader2,
  XCircle
} from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'
import { formatTanggal, PINJAM_STATUS, LAPORAN_STATUS } from '~/utils/format'

definePageMeta({ title: 'Info Barang' })

const route = useRoute()
const admin = useAdminService()
const authStore = useAuthStore()

const loading = ref(true)
const error = ref<string | null>(null)
const barang = ref<Barang | null>(null)

const kode = computed(() => String(route.params.kode ?? ''))

interface StatusInfo {
  label: string
  badge: string
  dot: string
}

const DEFAULT_STATUS: StatusInfo = {
  label: 'Aktif',
  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dot: 'bg-emerald-500'
}

const STATUS: Record<string, StatusInfo> = {
  aktif: DEFAULT_STATUS,
  rusak: { label: 'Rusak', badge: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  dipinjam: { label: 'Dipinjam', badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  maintenance: { label: 'Maintenance', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
}

const status = computed<StatusInfo>(() => STATUS[barang.value?.status ?? ''] ?? DEFAULT_STATUS)

// Aksi pinjam/lapor hanya untuk guru & murid yang sudah login (double job: murid prioritas)
const actions = computed<{ lapor: string; pinjam: string } | null>(() => {
  if (!authStore.isAuthenticated) return null
  if (authStore.hasRole('murid')) return { lapor: '/murid/lapor', pinjam: '/murid/peminjaman' }
  if (authStore.hasRole('guru')) return { lapor: '/guru/lapor-kerusakan', pinjam: '/guru/peminjaman' }
  return null
})

async function load() {
  loading.value = true
  error.value = null
  try {
    // Huruf besar agar cocok dengan kode QR tersimpan (BRG-XXXXXXXX)
    barang.value = await admin.barang.byKode(kode.value.trim().toUpperCase())
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Barang tidak ditemukan.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header brand -->
    <header class="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-8 pb-14 text-white">
      <div class="flex items-center gap-2.5 mb-4">
        <div class="w-9 h-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
          <ShieldCheck class="w-5 h-5" />
        </div>
        <div class="text-sm font-semibold">Sistem Manajemen Aset Sekolah</div>
      </div>
      <p class="text-blue-100 text-xs font-medium uppercase tracking-widest">Info Barang</p>
    </header>

    <main class="px-4 -mt-9 pb-10 max-w-md mx-auto">
      <!-- Loading -->
      <div v-if="loading" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <Loader2 class="w-8 h-8 mx-auto text-blue-500 animate-spin" />
        <p class="mt-3 text-sm text-gray-500">Memuat info barang…</p>
      </div>

      <!-- Tidak ditemukan / error -->
      <div v-else-if="error || !barang" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <XCircle class="w-10 h-10 mx-auto text-rose-400" />
        <h2 class="mt-3 font-semibold text-gray-900">Barang Tidak Ditemukan</h2>
        <p class="mt-1 text-sm text-gray-500">
          Kode <b class="font-mono">{{ kode }}</b> tidak terdaftar di sistem.
        </p>
        <NuxtLink to="/login" class="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
          <LogIn class="w-4 h-4" />
          Masuk ke Aplikasi
        </NuxtLink>
      </div>

      <!-- Info barang -->
      <template v-else>
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="p-5 flex items-start gap-4">
            <div class="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <Package class="w-7 h-7 text-blue-600" />
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="text-sm font-bold text-gray-900 leading-snug">{{ barang.nama }}</h1>
              <div class="mt-2 flex items-center gap-2">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-2xs font-semibold"
                  :class="status.badge"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="status.dot" />
                  {{ status.label }}
                </span>
                <span class="inline-flex items-center gap-1 text-xs font-mono text-gray-400 bg-gray-50 rounded-lg px-2 py-1 border border-gray-100">
                  <QrCode class="w-3.5 h-3.5" />
                  {{ barang.kode_qr }}
                </span>
              </div>
            </div>
          </div>

          <dl class="border-t border-gray-100 divide-y divide-gray-50">
            <div class="flex items-center gap-3 px-5 py-3">
              <Package class="w-4 h-4 text-gray-400 shrink-0" />
              <dt class="text-xs text-gray-500 w-24">Stok</dt>
              <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ barang.jumlah ?? 1 }} unit</dd>
            </div>
            <div class="flex items-center gap-3 px-5 py-3">
              <Tag class="w-4 h-4 text-gray-400 shrink-0" />
              <dt class="text-xs text-gray-500 w-24">Kategori</dt>
              <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ barang.kategori?.nama ?? '—' }}</dd>
            </div>
            <div class="flex items-center gap-3 px-5 py-3">
              <MapPin class="w-4 h-4 text-gray-400 shrink-0" />
              <dt class="text-xs text-gray-500 w-24">Ruangan</dt>
              <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ barang.ruangan?.nama ?? '—' }}</dd>
            </div>
            <div class="flex items-center gap-3 px-5 py-3">
              <Landmark class="w-4 h-4 text-gray-400 shrink-0" />
              <dt class="text-xs text-gray-500 w-24">Gedung</dt>
              <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ barang.ruangan?.gedung?.nama ?? '—' }}</dd>
            </div>
            <div class="flex items-center gap-3 px-5 py-3">
              <Building2 class="w-4 h-4 text-gray-400 shrink-0" />
              <dt class="text-xs text-gray-500 w-24">Proli</dt>
              <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ barang.proli?.nama ?? '—' }}</dd>
            </div>
            <div class="flex items-center gap-3 px-5 py-3">
              <Users class="w-4 h-4 text-gray-400 shrink-0" />
              <dt class="text-xs text-gray-500 w-24">Pemilik</dt>
              <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ barang.owner_type === 'sarpras' ? 'Sarpras' : 'Proli' }}</dd>
            </div>
            <div class="flex items-center gap-3 px-5 py-3">
              <Calendar class="w-4 h-4 text-gray-400 shrink-0" />
              <dt class="text-xs text-gray-500 w-24">Terdaftar</dt>
              <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ formatTanggal(barang.created_at) }}</dd>
            </div>
          </dl>

          <div v-if="barang.deskripsi" class="border-t border-gray-100 px-5 py-4">
            <div class="text-2xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Deskripsi</div>
            <p class="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{{ barang.deskripsi }}</p>
          </div>

          <!-- Riwayat peminjaman & kerusakan -->
          <div class="border-t border-gray-100 bg-gray-50/60 px-5 py-4">
            <div class="text-2xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Riwayat</div>
            <div v-if="barang.peminjaman?.length || barang.laporanKerusakan?.length" class="space-y-1.5">
              <div v-for="p in barang.peminjaman" :key="'p' + p.id" class="flex items-center gap-2 text-xs">
                <ArrowLeftRight class="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span class="text-gray-600 truncate min-w-0">{{ p.peminjam?.name ?? 'Peminjam' }}</span>
                <span
                  class="ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded"
                  :class="PINJAM_STATUS[p.status]?.cls ?? 'bg-gray-50 text-gray-700'"
                >
                  {{ PINJAM_STATUS[p.status]?.label ?? p.status }}
                </span>
              </div>
              <div v-for="l in barang.laporanKerusakan" :key="'l' + l.id" class="flex items-center gap-2 text-xs">
                <AlertTriangle class="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span class="text-gray-600 truncate min-w-0">{{ l.deskripsi }}</span>
                <span
                  class="ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded"
                  :class="LAPORAN_STATUS[l.status]?.cls ?? 'bg-gray-50 text-gray-700'"
                >
                  {{ LAPORAN_STATUS[l.status]?.label ?? l.status }}
                </span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400">Belum ada riwayat peminjaman atau kerusakan.</p>
          </div>
        </div>

        <!-- Aksi saat login sebagai guru/murid -->
        <div v-if="actions" class="mt-4 grid grid-cols-2 gap-2">
          <NuxtLink
            v-if="barang.bisa_dipinjam !== false"
            :to="{ path: actions.pinjam, query: { kode: barang.kode_qr } }"
            class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <ArrowLeftRight class="w-4 h-4" />
            Pinjam
          </NuxtLink>
          <div
            v-else
            class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-400"
            title="Barang ini tidak bisa dipinjam"
          >
            <ArrowLeftRight class="w-4 h-4" />
            Tidak Bisa Dipinjam
          </div>
          <NuxtLink
            :to="{ path: actions.lapor, query: { kode: barang.kode_qr } }"
            class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 transition"
          >
            <AlertTriangle class="w-4 h-4" />
            Lapor Rusak
          </NuxtLink>
        </div>

        <!-- Ajakan login jika belum masuk -->
        <div v-else-if="!authStore.isAuthenticated" class="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p class="text-xs text-gray-500">Ingin meminjam atau melaporkan kerusakan barang ini?</p>
          <NuxtLink to="/login" class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">
            <LogIn class="w-4 h-4" />
            Masuk ke Aplikasi
          </NuxtLink>
        </div>

        <p class="mt-4 text-center text-2xs text-gray-400">Info ini terbuka untuk umum dari scan QR barang.</p>
      </template>
    </main>
  </div>
</template>
