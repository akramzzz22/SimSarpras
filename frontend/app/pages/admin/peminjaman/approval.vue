<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  ClipboardCheck,
  Check,
  X,
  RefreshCw,
  PackageCheck,
  RotateCcw,
  Loader2,
  Camera,
  AlertTriangle,
  FileText
} from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Peminjaman' })

const admin = useAdminService()

const items = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const filterStatus = ref('all')
const actionId = ref<number | null>(null)

const filtered = computed(() =>
  filterStatus.value === 'all' ? items.value : items.value.filter((p) => p.status === filterStatus.value)
)

const statusOptions = ['all', 'menunggu', 'disetujui', 'ditolak', 'dipinjam', 'dikembalikan']

// Modal pengembalian dengan foto wajib
const showModal = ref(false)
const modalTarget = ref<any | null>(null)
const fotoKembali = ref('')
const modalError = ref<string | null>(null)
const savingReturn = ref(false)

function openReturnModal(p: any) {
  modalTarget.value = p
  fotoKembali.value = ''
  modalError.value = null
  showModal.value = true
}

const fotoModalInput = ref<HTMLInputElement | null>(null)
function pickFoto() {
  fotoModalInput.value?.click()
}

function onFotoChange(e: Event) {
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
  const reader = new FileReader()
  reader.onload = () => {
    fotoKembali.value = String(reader.result)
    modalError.value = null
  }
  reader.readAsDataURL(file)
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
    modalError.value = e?.data?.message ?? 'Gagal memproses pengembalian.'
  } finally {
    savingReturn.value = false
    actionId.value = null
  }
}

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

async function approve(id: number) {
  actionId.value = id
  try {
    await admin.peminjaman.approve(id)
    await load()
  } catch {
    alert('Gagal menyetujui peminjaman.')
  } finally {
    actionId.value = null
  }
}

async function reject(id: number) {
  actionId.value = id
  try {
    await admin.peminjaman.reject(id)
    await load()
  } catch {
    alert('Gagal menolak peminjaman.')
  } finally {
    actionId.value = null
  }
}

async function kembalikan(p: any) {
  openReturnModal(p)
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-100 text-amber-800',
    disetujui: 'bg-emerald-100 text-emerald-800',
    ditolak: 'bg-rose-100 text-rose-800',
    dipinjam: 'bg-blue-100 text-blue-800',
    dikembalikan: 'bg-gray-100 text-gray-700'
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

const formatTanggal = (d?: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Peminjaman</h2>
        <p class="text-sm text-gray-500 mt-1">Persetujuan & pengembalian peminjaman barang.</p>
      </div>
      <button class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition" @click="load">
        <RefreshCw class="w-4 h-4" />
        Muat Ulang
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="s in statusOptions"
        :key="s"
        class="px-3 py-1.5 rounded-full text-sm font-medium border transition"
        :class="filterStatus === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="filterStatus = s"
      >
        {{ s }}
      </button>
    </div>

    <div v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</div>

    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="p in filtered" :key="p.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="font-semibold text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
            <div class="text-xs text-gray-500 mt-0.5">
              {{ p.peminjam?.name ?? 'User #' + p.peminjam_id }}
            </div>
            <div class="text-xs text-gray-400 mt-1">
              {{ formatTanggal(p.tanggal_pinjam) }} • Jam ke-{{ p.jam_mulai }} – {{ p.jam_selesai }}
            </div>
            <div v-if="p.keperluan" class="text-xs text-gray-500 mt-1">
              <span class="font-medium text-gray-600">Keperluan:</span> {{ p.keperluan }}
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="statusBadge(p.status)">{{ p.status }}</span>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <template v-if="p.status === 'menunggu'">
            <button
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
              :disabled="actionId === p.id"
              @click="approve(p.id)"
            >
              <Loader2 v-if="actionId === p.id" class="w-3.5 h-3.5 animate-spin" />
              <Check v-else class="w-3.5 h-3.5" />
              Setujui
            </button>
            <button
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-60"
              :disabled="actionId === p.id"
              @click="reject(p.id)"
            >
              <X class="w-3.5 h-3.5" />
              Tolak
            </button>
          </template>
          <template v-else-if="p.status === 'disetujui' || p.status === 'dipinjam'">
            <button
              v-if="p.foto_pinjam"
              class="text-xs text-blue-600 hover:underline"
              @click="p.showFoto = !p.showFoto"
            >
              {{ p.showFoto ? 'Sembunyikan foto' : 'Lihat foto pinjam' }}
            </button>
            <NuxtLink
              :to="`/surat-peminjaman/${p.id}`"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition"
            >
              <FileText class="w-3.5 h-3.5" />
              Cetak Surat
            </NuxtLink>
            <button
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60"
              :disabled="actionId === p.id"
              @click="kembalikan(p)"
            >
              <RotateCcw v-if="actionId !== p.id" class="w-3.5 h-3.5" />
              <Loader2 v-else class="w-3.5 h-3.5 animate-spin" />
              Kembalikan
            </button>
          </template>
          <NuxtLink
            v-else-if="p.status === 'dikembalikan'"
            :to="`/surat-peminjaman/${p.id}`"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition"
          >
            <FileText class="w-3.5 h-3.5" />
            Cetak Surat
          </NuxtLink>
          <span v-else class="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <PackageCheck class="w-3.5 h-3.5" />
            {{ p.status === 'dikembalikan' ? 'Sudah dikembalikan' : 'Diproses' }}
          </span>
        </div>
        <img
          v-if="p.showFoto && p.foto_pinjam"
          :src="p.foto_pinjam"
          class="mt-3 max-h-44 rounded-xl border border-gray-100 object-cover"
          alt="Foto saat pinjam"
        />
      </div>

      <div v-if="!filtered.length && !loading" class="md:col-span-2 py-12 text-center">
        <ClipboardCheck class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">Tidak ada peminjaman dengan status ini.</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

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
        <p class="text-xs text-gray-400 mb-4">Tanggal {{ formatTanggal(modalTarget?.tanggal_pinjam) }} • Jam ke-{{ modalTarget?.jam_mulai }} – {{ modalTarget?.jam_selesai }}</p>

        <label class="block text-sm font-medium text-gray-700 mb-1">Foto Barang Dikembalikan <span class="text-rose-500">*</span></label>
        <div
          class="relative rounded-xl border-2 border-dashed p-3 text-center transition cursor-pointer"
          :class="fotoKembali ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'"
          @click="pickFoto"
        >
          <img v-if="fotoKembali" :src="fotoKembali" class="max-h-40 mx-auto rounded-lg object-cover" alt="Foto pengembalian" />
          <div v-else class="py-4">
            <Camera class="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <p class="text-xs text-gray-500">Foto kondisi barang saat dikembalikan (maks 5MB)</p>
          </div>
        </div>
        <input ref="fotoModalInput" type="file" accept="image/*" class="hidden" @change="onFotoChange" />

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
