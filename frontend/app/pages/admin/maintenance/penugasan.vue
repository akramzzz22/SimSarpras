<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  ClipboardList,
  RefreshCw,
  AlertTriangle,
  User,
  Store,
  CheckCircle2,
  Loader2,
  X,
  Wrench,
  Play,
  Inbox
} from 'lucide-vue-next'
import { useAdminService, type LaporanKerusakan } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Penugasan' })

const admin = useAdminService()

const items = ref<LaporanKerusakan[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const filterStatus = ref<'all' | 'menunggu' | 'diverifikasi' | 'diperbaiki' | 'selesai'>('all')

// Modal penugasan
const showAssign = ref(false)
const assignTarget = ref<LaporanKerusakan | null>(null)
const assignType = ref<'staff' | 'vendor'>('staff')
const assignValue = ref('')
const assignSaving = ref(false)
const assignError = ref<string | null>(null)
const staffOptions = ref<{ value: number; label: string }[]>([])
const vendorOptions = ref<{ value: number; label: string }[]>([])
const actionLoadingId = ref<number | null>(null)

const statusOptions = [
  { v: 'all', l: 'Semua' },
  { v: 'menunggu', l: 'Menunggu' },
  { v: 'diverifikasi', l: 'Diverifikasi' },
  { v: 'diperbaiki', l: 'Diperbaiki' },
  { v: 'selesai', l: 'Selesai' }
] as const

const filtered = computed(() =>
  filterStatus.value === 'all' ? items.value : items.value.filter((l) => l.status === filterStatus.value)
)

// ---- Pagination: 20 penugasan per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedFiltered = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(filtered, () => {
  page.value = 1
})

const counts = computed(() => ({
  menunggu: items.value.filter((l) => l.status === 'menunggu').length,
  berjalan: items.value.filter((l) => l.status === 'diverifikasi' || l.status === 'diperbaiki').length,
  selesai: items.value.filter((l) => l.status === 'selesai').length
}))

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-50 text-amber-700',
    diverifikasi: 'bg-red-50 text-red-700',
    diperbaiki: 'bg-violet-50 text-violet-700',
    selesai: 'bg-emerald-50 text-emerald-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const formatTanggal = (d?: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.laporan.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat penugasan.'
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  const [staff, vendor] = await Promise.all([
    admin.master.list('users', { role: 'staff_sarpras', per_page: 100 }),
    admin.master.list('vendor', { per_page: 100 })
  ])
  staffOptions.value = staff.data.map((u: any) => ({ value: u.id, label: u.name }))
  vendorOptions.value = vendor.data.map((v: any) => ({ value: v.id, label: v.nama }))
}

function setAssignType(type: 'staff' | 'vendor') {
  assignType.value = type
  assignValue.value = ''
  assignError.value = null
}

function openAssign(l: LaporanKerusakan) {
  assignTarget.value = l
  setAssignType('staff')
  showAssign.value = true
}

async function submitAssign() {
  if (!assignTarget.value || !assignValue.value) {
    assignError.value = 'Pilih staff atau vendor terlebih dahulu.'
    return
  }
  assignSaving.value = true
  assignError.value = null
  try {
    const body = assignType.value === 'staff'
      ? { assigned_to: Number(assignValue.value) }
      : { vendor_id: Number(assignValue.value) }
    await admin.laporan.verifikasi(assignTarget.value.id, body)
    showAssign.value = false
    await load()
  } catch (e: any) {
    assignError.value = e?.data?.message ?? 'Gagal menugaskan. Periksa kembali pilihan Anda.'
  } finally {
    assignSaving.value = false
  }
}

async function changeStatus(l: LaporanKerusakan, status: 'diverifikasi' | 'diperbaiki' | 'selesai') {
  actionLoadingId.value = l.id
  try {
    await admin.laporan.update(l.id, { status })
    await load()
  } catch {
    alert('Gagal mengubah status penugasan.')
  } finally {
    actionLoadingId.value = null
  }
}

onMounted(() => {
  load()
  loadOptions().catch(() => {})
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Penugasan</h2>
        <p class="text-sm text-gray-500 mt-1">Tugaskan staff atau vendor untuk menangani laporan kerusakan.</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition w-fit"
        @click="load"
      >
        <RefreshCw class="w-4 h-4" />
        Muat Ulang
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-amber-50 rounded-2xl border border-amber-100 p-4">
        <div class="text-xs font-medium text-amber-600 uppercase tracking-wide">Menunggu</div>
        <div class="text-2xl font-bold text-amber-700 mt-1">{{ counts.menunggu }}</div>
      </div>
      <div class="bg-red-50 rounded-2xl border border-red-100 p-4">
        <div class="text-xs font-medium text-red-600 uppercase tracking-wide">Berjalan</div>
        <div class="text-2xl font-bold text-red-700 mt-1">{{ counts.berjalan }}</div>
      </div>
      <div class="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
        <div class="text-xs font-medium text-emerald-600 uppercase tracking-wide">Selesai</div>
        <div class="text-2xl font-bold text-emerald-700 mt-1">{{ counts.selesai }}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="s in statusOptions"
        :key="s.v"
        class="px-3 py-1.5 rounded text-sm font-medium border transition"
        :class="filterStatus === s.v ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="filterStatus = s.v"
      >
        {{ s.l }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- List -->
    <div class="grid md:grid-cols-2 gap-4">
      <div
        v-for="l in pagedFiltered"
        :key="l.id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <AlertTriangle class="w-5 h-5 text-rose-500" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ formatTanggal(l.created_at) }} • oleh {{ l.pelapor?.name ?? 'User' }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded shrink-0" :class="statusBadge(l.status)">{{ l.status }}</span>
        </div>

        <p class="mt-3 text-sm text-gray-600 line-clamp-2">{{ l.deskripsi }}</p>

        <div class="mt-3 flex flex-wrap gap-2 text-xs">
          <span
            class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-600"
            :class="l.assignedStaff ? '' : 'opacity-50'"
          >
            <User class="w-3.5 h-3.5" />
            {{ l.assignedStaff?.name ?? 'Belum ada staff' }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-600"
            :class="l.vendor ? '' : 'opacity-50'"
          >
            <Store class="w-3.5 h-3.5" />
            {{ l.vendor?.nama ?? 'Belum ada vendor' }}
          </span>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <!-- Menunggu: verifikasi & tugaskan -->
          <button
            v-if="l.status === 'menunggu'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
            @click="openAssign(l)"
          >
            <ClipboardList class="w-3.5 h-3.5" />
            Verifikasi & Tugaskan
          </button>

          <!-- Diverifikasi: mulai perbaikan -->
          <button
            v-if="l.status === 'diverifikasi'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition disabled:opacity-60"
            :disabled="actionLoadingId === l.id"
            @click="changeStatus(l, 'diperbaiki')"
          >
            <Loader2 v-if="actionLoadingId === l.id" class="w-3.5 h-3.5 animate-spin" />
            <Play v-else class="w-3.5 h-3.5" />
            Mulai Perbaikan
          </button>

          <!-- Diperbaiki: tandai selesai -->
          <button
            v-if="l.status === 'diperbaiki'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
            :disabled="actionLoadingId === l.id"
            @click="changeStatus(l, 'selesai')"
          >
            <Loader2 v-if="actionLoadingId === l.id" class="w-3.5 h-3.5 animate-spin" />
            <CheckCircle2 v-else class="w-3.5 h-3.5" />
            Tandai Selesai
          </button>

          <span v-if="l.status === 'selesai'" class="inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 class="w-3.5 h-3.5" />
            Penanganan selesai
          </span>

          <!-- Sudah ditugaskan: bisa ganti penanggung jawab -->
          <button
            v-if="l.status === 'diverifikasi'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition"
            @click="openAssign(l)"
          >
            <Wrench class="w-3.5 h-3.5" />
            Ganti Petugas
          </button>
        </div>
      </div>

      <div v-if="!filtered.length && !loading" class="md:col-span-2 py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">
          {{ items.length ? 'Tidak ada penugasan dengan status ini.' : 'Belum ada laporan kerusakan.' }}
        </p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

    <!-- Pagination: 20 penugasan per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="penugasan" />

    <!-- Modal penugasan -->
    <div v-if="showAssign && assignTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showAssign = false" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">Tugaskan Penanganan</h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" @click="showAssign = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form class="px-6 py-5 space-y-4" @submit.prevent="submitAssign">
          <div class="text-sm text-gray-600">
            <span class="font-medium text-gray-900">{{ assignTarget.barang?.nama ?? 'Barang #' + assignTarget.barang_id }}</span>
            <span class="text-gray-400"> — ditugaskan ke:</span>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition"
              :class="assignType === 'staff' ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
              @click="setAssignType('staff')"
            >
              <User class="w-4 h-4" />
              Staff
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition"
              :class="assignType === 'vendor' ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
              @click="setAssignType('vendor')"
            >
              <Store class="w-4 h-4" />
              Vendor
            </button>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{{ assignType === 'staff' ? 'Pilih Staff' : 'Pilih Vendor' }}</label>
            <select
              v-model="assignValue"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">— Pilih —</option>
              <option
                v-for="o in (assignType === 'staff' ? staffOptions : vendorOptions)"
                :key="o.value"
                :value="o.value"
              >
                {{ o.label }}
              </option>
            </select>
          </div>

          <p v-if="assignError" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{{ assignError }}</p>

          <div class="flex justify-end gap-3 pt-1">
            <button type="button" class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50" @click="showAssign = false">
              Batal
            </button>
            <button
              type="submit"
              :disabled="assignSaving"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
            >
              <Loader2 v-if="assignSaving" class="w-4 h-4 animate-spin" />
              {{ assignSaving ? 'Menyimpan…' : 'Tugaskan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
