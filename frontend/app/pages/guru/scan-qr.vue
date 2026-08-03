<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  QrCode, Search, Loader2, CheckCircle2, AlertTriangle, ArrowLeftRight, X, Camera,
  MapPin, Tag, Building2, Landmark, Calendar, Users
} from 'lucide-vue-next'
import QrScanner from '~/components/qr-scanner.vue'
import { useAdminService, type Barang } from '~/services/api/admin'
import { formatTanggal, PINJAM_STATUS, LAPORAN_STATUS, extractKodeFromScan } from '~/utils/format'

definePageMeta({ layout: 'mobile', middleware: ['auth'], title: 'Scan QR' })

const admin = useAdminService()
const scannerRef = ref<InstanceType<typeof QrScanner> | null>(null)

const code = ref('')
const searching = ref(false)
const result = ref<Barang | null>(null)
const notFound = ref(false)
const error = ref<string | null>(null)

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

const status = computed<StatusInfo>(() => STATUS[result.value?.status ?? ''] ?? DEFAULT_STATUS)

function handleScanned(value: string) {
  code.value = value
  find()
}

async function find() {
  // QR berisi URL publik (/barang/BRG-XXXX) → ambil kodenya dulu agar lookup cocok
  code.value = extractKodeFromScan(code.value)
  if (!code.value.trim()) return
  searching.value = true
  notFound.value = false
  result.value = null
  error.value = null
  try {
    // Huruf besar agar cocok dengan kode QR tersimpan (BRG-XXXXXXXX)
    result.value = await admin.barang.byKode(code.value.trim().toUpperCase())
  } catch (e: any) {
    if (e?.statusCode === 404 || e?.response?.status === 404) {
      notFound.value = true
    } else {
      error.value = e?.data?.message ?? 'Gagal mencari barang.'
    }
  } finally {
    searching.value = false
  }
}

function reset() {
  code.value = ''
  result.value = null
  notFound.value = false
  error.value = null
  scannerRef.value?.resume()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Scanner kamera -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div class="flex items-center gap-2 mb-3">
        <Camera class="w-4 h-4 text-violet-600" />
        <h3 class="font-semibold text-gray-900 text-sm">Scan dengan Kamera</h3>
      </div>
      <QrScanner ref="scannerRef" @scanned="handleScanned" />
    </div>

    <!-- Hasil scan kamera / manual -->
    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div v-if="result" class="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
      <div class="flex items-start gap-3 p-4">
        <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <CheckCircle2 class="w-5 h-5 text-emerald-600" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-semibold text-gray-900">{{ result.nama }}</div>
          <div class="text-xs text-gray-400 font-mono">{{ result.kode_qr }}</div>
          <span class="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold" :class="status.badge">
            <span class="w-1.5 h-1.5 rounded-full" :class="status.dot" />
            {{ status.label }}
          </span>
        </div>
        <button class="ml-auto p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" @click="reset">
          <X class="w-4 h-4" />
        </button>
      </div>

      <dl class="border-t border-gray-100 divide-y divide-gray-50">
        <div class="flex items-center gap-3 px-4 py-2.5">
          <Tag class="w-4 h-4 text-gray-400 shrink-0" />
          <dt class="text-xs text-gray-500 w-20">Kategori</dt>
          <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ result.kategori?.nama ?? '—' }}</dd>
        </div>
        <div class="flex items-center gap-3 px-4 py-2.5">
          <MapPin class="w-4 h-4 text-gray-400 shrink-0" />
          <dt class="text-xs text-gray-500 w-20">Ruangan</dt>
          <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ result.ruangan?.nama ?? '—' }}</dd>
        </div>
        <div class="flex items-center gap-3 px-4 py-2.5">
          <Landmark class="w-4 h-4 text-gray-400 shrink-0" />
          <dt class="text-xs text-gray-500 w-20">Gedung</dt>
          <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ result.ruangan?.gedung?.nama ?? '—' }}</dd>
        </div>
        <div class="flex items-center gap-3 px-4 py-2.5">
          <Building2 class="w-4 h-4 text-gray-400 shrink-0" />
          <dt class="text-xs text-gray-500 w-20">Proli</dt>
          <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ result.proli?.nama ?? '—' }}</dd>
        </div>
        <div class="flex items-center gap-3 px-4 py-2.5">
          <Users class="w-4 h-4 text-gray-400 shrink-0" />
          <dt class="text-xs text-gray-500 w-20">Pemilik</dt>
          <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ result.owner_type === 'sarpras' ? 'Sarpras' : 'Proli' }}</dd>
        </div>
        <div class="flex items-center gap-3 px-4 py-2.5">
          <Calendar class="w-4 h-4 text-gray-400 shrink-0" />
          <dt class="text-xs text-gray-500 w-20">Terdaftar</dt>
          <dd class="flex-1 text-sm font-medium text-gray-800 text-right">{{ formatTanggal(result.created_at) }}</dd>
        </div>
      </dl>

      <div v-if="result.deskripsi" class="border-t border-gray-100 bg-slate-50 px-4 py-3">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Deskripsi Barang</div>
        <p class="text-sm text-gray-700 leading-relaxed">{{ result.deskripsi }}</p>
      </div>

      <!-- Riwayat peminjaman & kerusakan -->
      <div class="border-t border-gray-100 bg-slate-50 px-4 py-3">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Riwayat</div>
        <div v-if="result.peminjaman?.length || result.laporanKerusakan?.length" class="space-y-1.5">
          <div v-for="p in result.peminjaman" :key="'p' + p.id" class="flex items-center gap-2 text-xs">
            <ArrowLeftRight class="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span class="text-gray-600 truncate min-w-0">{{ p.peminjam?.name ?? 'Peminjam' }}</span>
            <span
              class="ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              :class="PINJAM_STATUS[p.status]?.cls ?? 'bg-gray-100 text-gray-600'"
            >
              {{ PINJAM_STATUS[p.status]?.label ?? p.status }}
            </span>
          </div>
          <div v-for="l in result.laporanKerusakan" :key="'l' + l.id" class="flex items-center gap-2 text-xs">
            <AlertTriangle class="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span class="text-gray-600 truncate min-w-0">{{ l.deskripsi }}</span>
            <span
              class="ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
              :class="LAPORAN_STATUS[l.status]?.cls ?? 'bg-gray-100 text-gray-600'"
            >
              {{ LAPORAN_STATUS[l.status]?.label ?? l.status }}
            </span>
          </div>
        </div>
        <p v-else class="text-xs text-gray-400">Belum ada riwayat peminjaman atau kerusakan.</p>
      </div>

      <div class="grid grid-cols-2 gap-2 p-4">
        <NuxtLink
          :to="{ path: '/guru/lapor-kerusakan', query: { kode: result.kode_qr } }"
          class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition"
        >
          <AlertTriangle class="w-4 h-4" /> Lapor Rusak
        </NuxtLink>
        <NuxtLink
          :to="{ path: '/guru/peminjaman', query: { kode: result.kode_qr } }"
          class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
        >
          <ArrowLeftRight class="w-4 h-4" /> Pinjam
        </NuxtLink>
      </div>
    </div>

    <div v-if="notFound" class="bg-white rounded-2xl border border-rose-200 shadow-sm p-4 text-center">
      <X class="w-10 h-10 mx-auto mb-2 text-rose-300" />
      <p class="text-sm text-gray-600">Barang dengan kode <b>{{ code }}</b> tidak ditemukan.</p>
      <p class="text-xs text-gray-400 mt-1">Periksa kembali kode QR yang Anda pindai.</p>
    </div>

    <!-- Input manual (fallback) -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <label class="block text-sm font-medium text-gray-700 mb-1">Atau masukkan kode manual</label>
      <div class="flex gap-2">
        <div class="relative flex-1">
          <QrCode class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            v-model="code"
            placeholder="Contoh: BRG-XXXXXXXX"
            class="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 uppercase"
            @keyup.enter="find"
          />
        </div>
        <button
          class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-60"
          :disabled="searching || !code"
          @click="find"
        >
          <Loader2 v-if="searching" class="w-4 h-4 animate-spin" />
          <Search v-else class="w-4 h-4" />
          Cari
        </button>
      </div>
      <p class="mt-2 text-xs text-gray-400">Ketik atau tempel kode QR barang (bisa juga scan manual dari label).</p>
    </div>
  </div>
</template>
