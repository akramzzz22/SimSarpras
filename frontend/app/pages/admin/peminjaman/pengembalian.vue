<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { PackageCheck, RefreshCw, Loader2, Inbox, Camera, X, AlertTriangle } from 'lucide-vue-next'
import { useAdminService, type Peminjaman } from '~/services/api/admin'
import { fmtJam } from '~/utils/format'
import SlotJamIndicator from '~/components/slot-jam-indicator.vue'
import Pagination from '~/components/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Pengembalian' })

const admin = useAdminService()

const items = ref<(Peminjaman & { showFoto?: boolean })[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const actionId = ref<number | null>(null)
const filterStatus = ref<'all' | 'disetujui' | 'dipinjam' | 'dikembalikan' | 'menunggu' | 'ditolak'>('all')

const showModal = ref(false)
const modalTarget = ref<Peminjaman | null>(null)
const fotoKembali = ref('')
const modalError = ref<string | null>(null)
const savingReturn = ref(false)

const filtered = computed(() =>
  filterStatus.value === 'all' ? items.value : items.value.filter((p) => p.status === filterStatus.value)
)

// ---- Pagination: 20 data per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedFiltered = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(filtered, () => {
  page.value = 1
})

const statusOptions = ['all', 'menunggu', 'disetujui', 'dipinjam', 'dikembalikan', 'ditolak'] as const

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.peminjaman.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat peminjaman.'
  } finally {
    loading.value = false
  }
}

function openReturnModal(p: Peminjaman) {
  modalTarget.value = p
  fotoKembali.value = ''
  modalError.value = null
  showModal.value = true
}

const fotoModalInput = ref<HTMLInputElement | null>(null)
const fotoUploading = ref(false)
function pickFoto() {
  fotoModalInput.value?.click()
}

async function onFotoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    modalError.value = 'File harus berupa gambar.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    modalError.value = 'Ukuran foto maksimal 5MB.'
    return
  }
  fotoUploading.value = true
  modalError.value = null
  try {
    const res = await admin.upload(file)
    fotoKembali.value = res.url
  } catch (err: any) {
    modalError.value = err?.data?.message ?? 'Gagal mengunggah foto.'
  } finally {
    fotoUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function confirmReturn() {
  if (!modalTarget.value) return
  if (!fotoKembali.value) {
    modalError.value = 'Foto barang wajib diunggah saat pengembalian.'
    return
  }
  actionId.value = modalTarget.value.id
  savingReturn.value = true
  modalError.value = null
  try {
    await admin.peminjaman.kembalikan(modalTarget.value.id, { foto_kembali: fotoKembali.value })
    showModal.value = false
    await load()
  } catch (e: any) {
    modalError.value = e?.data?.message ?? 'Gagal mencatat pengembalian.'
  } finally {
    savingReturn.value = false
    actionId.value = null
  }
}

const badge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-50 text-amber-700',
    disetujui: 'bg-red-50 text-red-700',
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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Pengembalian</h2>
        <p class="text-sm text-gray-500 mt-1">Kelola pengembalian barang — wajib upload foto barang.</p>
      </div>
      <button class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition w-fit" @click="load">
        <RefreshCw class="w-4 h-4" />
        Muat Ulang
      </button>
    </div>

    <!-- Filter -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="s in statusOptions"
        :key="s"
        class="px-3 py-1.5 rounded text-sm font-medium border transition"
        :class="filterStatus === s ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="filterStatus = s"
      >
        {{ s }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- List -->
    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="p in pagedFiltered" :key="p.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <PackageCheck class="w-5 h-5 text-red-600" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">Peminjam: {{ p.peminjam?.name ?? 'User' }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded shrink-0" :class="badge(p.status)">{{ p.status }}</span>
        </div>

        <div class="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Tanggal: <b class="text-gray-700">{{ fmt(p.tanggal_pinjam) }}</b></span>
          <span>Jam: <b class="text-gray-700">{{ fmtJam(p.jam_mulai) }} – {{ fmtJam(p.jam_selesai) }}</b></span>
        </div>

        <!-- Indikator visual slot jam: merah = jam dipesan, hijau = jam tersedia -->
        <SlotJamIndicator :jam-mulai="p.jam_mulai" :jam-selesai="p.jam_selesai" />

        <div class="mt-4 flex items-center gap-3">
          <button
            v-if="['disetujui', 'dipinjam'].includes(p.status)"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
            :disabled="actionId === p.id"
            @click="openReturnModal(p)"
          >
            <PackageCheck class="w-3.5 h-3.5" />
            Catat Pengembalian
          </button>
          <span v-if="p.status === 'dikembalikan'" class="inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <PackageCheck class="w-3.5 h-3.5" /> Sudah dikembalikan
          </span>
          <button
            v-if="p.foto_pinjam"
            class="text-xs text-red-600 hover:underline"
            @click="p.showFoto = !p.showFoto"
          >
            {{ p.showFoto ? 'Sembunyikan foto pinjam' : 'Lihat foto saat pinjam' }}
          </button>
        </div>
        <img
          v-if="p.showFoto && p.foto_pinjam"
          :src="p.foto_pinjam"
          class="mt-3 max-h-44 rounded-xl border border-gray-100 object-cover"
          alt="Foto saat pinjam"
        />
      </div>

      <div v-if="!filtered.length && !loading" class="md:col-span-2 py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">{{ items.length ? 'Tidak ada peminjaman dengan status ini.' : 'Belum ada data peminjaman.' }}</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

    <!-- Pagination: 20 data per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="peminjaman" />

    <!-- Modal pengembalian (foto wajib) -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="!savingReturn && (showModal = false)" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900">Catat Pengembalian</h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" :disabled="savingReturn" @click="showModal = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <p class="text-sm text-gray-600 mb-1">Barang: <b>{{ modalTarget?.barang?.nama }}</b></p>
        <p class="text-xs text-gray-400 mb-4">Tanggal {{ fmt(modalTarget?.tanggal_pinjam) }} • {{ fmtJam(modalTarget?.jam_mulai) }} – {{ fmtJam(modalTarget?.jam_selesai) }}</p>

        <label class="block text-sm font-medium text-gray-700 mb-1">Foto Barang Dikembalikan <span class="text-rose-500">*</span></label>
        <div
          class="relative rounded-xl border-2 border-dashed p-3 text-center transition cursor-pointer"
          :class="fotoKembali ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-300 hover:border-red-400 hover:bg-red-50/30'"
          @click="pickFoto"
        >
          <img v-if="fotoKembali" :src="fotoKembali" class="max-h-40 mx-auto rounded-lg object-cover" alt="Foto pengembalian" />
          <div v-else class="py-4">
            <Camera v-if="!fotoUploading" class="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <Loader2 v-else class="w-6 h-6 mx-auto mb-1 text-emerald-500 animate-spin" />
            <p class="text-xs text-gray-500">{{ fotoUploading ? 'Mengunggah…' : 'Foto kondisi barang saat dikembalikan (maks 5MB)' }}</p>
          </div>
        </div>
        <input ref="fotoModalInput" type="file" accept="image/*" class="hidden" :disabled="fotoUploading" @change="onFotoChange" />

        <div v-if="modalError" class="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
          {{ modalError }}
        </div>

        <div class="mt-5 flex justify-end gap-3">
          <button class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50" :disabled="savingReturn" @click="showModal = false">
            Batal
          </button>
          <button
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
            :disabled="savingReturn"
            @click="confirmReturn"
          >
            <Loader2 v-if="savingReturn" class="w-4 h-4 animate-spin" />
            <PackageCheck v-else class="w-4 h-4" />
            {{ savingReturn ? 'Menyimpan…' : 'Konfirmasi Pengembalian' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
