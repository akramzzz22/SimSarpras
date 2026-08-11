<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  CalendarClock,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  Loader2,
  X,
  Wrench,
  Play,
  CheckCircle2,
  User,
  Store,
  Camera,
  Receipt
} from 'lucide-vue-next'
import { useAdminService, type Maintenance } from '~/services/api/admin'
import { formatRupiah } from '~/utils/format'
import Pagination from '~/components/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Jadwal Maintenance' })

const admin = useAdminService()

const items = ref<Maintenance[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const search = ref('')
const filterStatus = ref<'all' | 'terjadwal' | 'berlangsung' | 'selesai'>('all')

const showForm = ref(false)
const editingId = ref<number | null>(null)
const formError = ref<string | null>(null)
// assign_type: 'staff' | 'vendor' — wajib pilih salah satu
const form = ref({
  barang_id: '',
  jenis_maintenance_id: '',
  tanggal_jadwal: '',
  assign_type: 'staff' as 'staff' | 'vendor',
  assign_value: '',
  catatan: '',
  biaya: '',
  resi_url: ''
})

const barangOptions = ref<{ value: number; label: string }[]>([])
const staffOptions = ref<{ value: number; label: string }[]>([])
const vendorOptions = ref<{ value: number; label: string }[]>([])
const jenisMaintOptions = ref<{ value: number; label: string }[]>([])
const statusLoadingId = ref<number | null>(null)

// Modal "Selesaikan" — input biaya + foto resi
const showComplete = ref(false)
const completeTarget = ref<Maintenance | null>(null)
const completeBiaya = ref('')
const completeResi = ref('')
const completeError = ref<string | null>(null)
const completeSaving = ref(false)

const resiFormInput = ref<HTMLInputElement | null>(null)
const resiCompleteInput = ref<HTMLInputElement | null>(null)
const resiUploadingForm = ref(false)
const resiUploadingComplete = ref(false)

const statusOptions = [
  { v: 'all', l: 'Semua' },
  { v: 'terjadwal', l: 'Terjadwal' },
  { v: 'berlangsung', l: 'Berlangsung' },
  { v: 'selesai', l: 'Selesai' }
] as const

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((m) => {
    const matchStatus = filterStatus.value === 'all' || m.status === filterStatus.value
    const matchQ = !q || (m.barang?.nama ?? '').toLowerCase().includes(q) || (m.staff?.name ?? '').toLowerCase().includes(q)
    return matchStatus && matchQ
  })
})

// ---- Pagination: 20 jadwal per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedFiltered = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(filtered, () => {
  page.value = 1
})

const counts = computed(() => ({
  total: items.value.length,
  terjadwal: items.value.filter((m) => m.status === 'terjadwal').length,
  berlangsung: items.value.filter((m) => m.status === 'berlangsung').length,
  selesai: items.value.filter((m) => m.status === 'selesai').length
}))

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    terjadwal: 'bg-amber-50 text-amber-700',
    berlangsung: 'bg-red-50 text-red-700',
    selesai: 'bg-emerald-50 text-emerald-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const formatTanggal = (d?: string) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.maintenance.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat jadwal maintenance.'
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  const [barang, staff, vendor, jenisMaint] = await Promise.all([
    admin.barang.list({ per_page: 100 }),
    admin.master.list('users', { role: 'staff_sarpras', per_page: 100 }),
    admin.master.list('vendor', { per_page: 100 }),
    admin.master.list('jenis-maintenance', { per_page: 100 })
  ])
  barangOptions.value = barang.data.map((b: any) => ({ value: b.id, label: b.nama }))
  staffOptions.value = staff.data.map((u: any) => ({ value: u.id, label: u.name }))
  vendorOptions.value = vendor.data.map((v: any) => ({ value: v.id, label: v.nama }))
  jenisMaintOptions.value = jenisMaint.data.map((j: any) => ({ value: j.id, label: j.nama }))
}

function resetForm() {
  form.value = { barang_id: '', jenis_maintenance_id: '', tanggal_jadwal: '', assign_type: 'staff', assign_value: '', catatan: '', biaya: '', resi_url: '' }
  formError.value = null
}

function setAssignType(type: 'staff' | 'vendor') {
  form.value.assign_type = type
  form.value.assign_value = ''
  formError.value = null
}

function openCreate() {
  editingId.value = null
  resetForm()
  showForm.value = true
}

function openEdit(m: Maintenance) {
  editingId.value = m.id
  resetForm()
  const hasStaff = !!m.staff_id
  form.value = {
    barang_id: String(m.barang_id ?? ''),
    jenis_maintenance_id: m.jenis_maintenance_id != null ? String(m.jenis_maintenance_id) : '',
    tanggal_jadwal: m.tanggal_jadwal ?? '',
    assign_type: hasStaff ? 'staff' : 'vendor',
    assign_value: String(hasStaff ? m.staff_id : m.vendor_id ?? ''),
    catatan: m.catatan ?? '',
    biaya: m.biaya ? String(m.biaya) : '',
    resi_url: m.resi_url ?? ''
  }
  showForm.value = true
}

// Upload foto resi (form edit & modal selesai)
function pickResiForm() {
  resiFormInput.value?.click()
}
function pickResiComplete() {
  resiCompleteInput.value?.click()
}

async function onResiChange(e: Event, target: 'form' | 'complete') {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    if (target === 'form') formError.value = 'File harus berupa gambar.'
    else completeError.value = 'File harus berupa gambar.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    if (target === 'form') formError.value = 'Ukuran foto maksimal 5MB.'
    else completeError.value = 'Ukuran foto maksimal 5MB.'
    return
  }
  if (target === 'form') {
    resiUploadingForm.value = true
    formError.value = null
  } else {
    resiUploadingComplete.value = true
    completeError.value = null
  }
  try {
    const res = await admin.upload(file)
    if (target === 'form') {
      form.value.resi_url = res.url
    } else {
      completeResi.value = res.url
    }
  } catch (err: any) {
    const msg = err?.data?.message ?? 'Gagal mengunggah foto resi.'
    if (target === 'form') formError.value = msg
    else completeError.value = msg
  } finally {
    resiUploadingForm.value = false
    resiUploadingComplete.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function submit() {
  if (!form.value.barang_id || !form.value.tanggal_jadwal) {
    formError.value = 'Barang dan tanggal jadwal wajib diisi.'
    return
  }
  if (!form.value.assign_value) {
    formError.value = `Pilih salah satu penanggung jawab: ${form.value.assign_type === 'staff' ? 'Staff' : 'Vendor'}.`
    return
  }
  if (Number(form.value.biaya) > 0 && !form.value.resi_url) {
    formError.value = 'Foto resi wajib diunggah jika ada biaya pengeluaran.'
    return
  }
  saving.value = true
  formError.value = null
  try {
    const isStaff = form.value.assign_type === 'staff'
    const body = {
      barang_id: Number(form.value.barang_id),
      jenis_maintenance_id: form.value.jenis_maintenance_id ? Number(form.value.jenis_maintenance_id) : null,
      tanggal_jadwal: form.value.tanggal_jadwal,
      staff_id: isStaff ? Number(form.value.assign_value) : null,
      vendor_id: !isStaff ? Number(form.value.assign_value) : null,
      catatan: form.value.catatan || null,
      biaya: form.value.biaya ? Number(form.value.biaya) : null,
      resi_url: form.value.resi_url || null
    }
    if (editingId.value !== null) {
      await admin.maintenance.update(editingId.value, body)
    } else {
      await admin.maintenance.create(body)
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    const err = e?.data?.errors
    const firstKey = err ? Object.keys(err)[0] : null
    formError.value = (firstKey && err[firstKey]?.[0]) || e?.data?.message || 'Gagal menyimpan jadwal.'
  } finally {
    saving.value = false
  }
}

// Alur selesai: buka modal biaya + foto resi
function openComplete(m: Maintenance) {
  completeTarget.value = m
  completeBiaya.value = m.biaya ? String(m.biaya) : ''
  completeResi.value = m.resi_url ?? ''
  completeError.value = null
  showComplete.value = true
}

async function confirmComplete() {
  if (!completeTarget.value) return
  if (Number(completeBiaya.value) > 0 && !completeResi.value) {
    completeError.value = 'Foto resi wajib diunggah jika ada biaya pengeluaran.'
    return
  }
  completeSaving.value = true
  completeError.value = null
  try {
    await admin.maintenance.update(completeTarget.value.id, {
      status: 'selesai',
      biaya: completeBiaya.value ? Number(completeBiaya.value) : null,
      resi_url: completeResi.value || null
    })
    showComplete.value = false
    await load()
  } catch (e: any) {
    completeError.value = e?.data?.message ?? 'Gagal menyelesaikan maintenance.'
  } finally {
    completeSaving.value = false
  }
}

async function changeStatus(m: Maintenance, status: 'berlangsung') {
  statusLoadingId.value = m.id
  try {
    await admin.maintenance.update(m.id, { status })
    await load()
  } catch {
    alert('Gagal mengubah status maintenance.')
  } finally {
    statusLoadingId.value = null
  }
}

async function remove(m: Maintenance) {
  if (!confirm(`Yakin ingin menghapus jadwal maintenance untuk "${m.barang?.nama ?? m.barang_id}"?`)) return
  try {
    await admin.maintenance.remove(m.id)
    await load()
  } catch {
    alert('Gagal menghapus jadwal.')
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
        <h2 class="text-sm font-bold text-gray-900">Jadwal Maintenance</h2>
        <p class="text-sm text-gray-500 mt-1">Kelola jadwal maintenance berkala barang — pilih salah satu penanggung jawab (staff atau vendor).</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition shadow-sm"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" />
        Buat Jadwal
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div class="text-xs font-medium text-gray-400 uppercase tracking-wide">Total Jadwal</div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ counts.total }}</div>
      </div>
      <div class="bg-amber-50 rounded-2xl border border-amber-100 p-4">
        <div class="text-xs font-medium text-amber-600 uppercase tracking-wide">Terjadwal</div>
        <div class="text-2xl font-bold text-amber-700 mt-1">{{ counts.terjadwal }}</div>
      </div>
      <div class="bg-red-50 rounded-2xl border border-red-100 p-4">
        <div class="text-xs font-medium text-red-600 uppercase tracking-wide">Berlangsung</div>
        <div class="text-2xl font-bold text-red-700 mt-1">{{ counts.berlangsung }}</div>
      </div>
      <div class="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
        <div class="text-xs font-medium text-emerald-600 uppercase tracking-wide">Selesai</div>
        <div class="text-2xl font-bold text-emerald-700 mt-1">{{ counts.selesai }}</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Cari barang atau staff…"
          class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
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
        <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
          <RefreshCw class="w-4 h-4" />
        </button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- List -->
    <div class="grid md:grid-cols-2 gap-4">
      <div
        v-for="m in pagedFiltered"
        :key="m.id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <CalendarClock class="w-5 h-5 text-red-600" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ formatTanggal(m.tanggal_jadwal) }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded shrink-0" :class="statusBadge(m.status)">{{ m.status }}</span>
        </div>

        <div class="mt-3 flex flex-wrap gap-2 text-xs">
          <span
            class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-600"
            :class="m.staff ? '' : 'opacity-50'"
          >
            <User class="w-3.5 h-3.5" />
            {{ m.staff?.name ?? 'Belum ada staff' }}
          </span>
          <span
            class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 text-gray-600"
            :class="m.vendor ? '' : 'opacity-50'"
          >
            <Store class="w-3.5 h-3.5" />
            {{ m.vendor?.nama ?? 'Belum ada vendor' }}
          </span>
        </div>

        <!-- Biaya + foto resi -->
        <div v-if="m.biaya || m.resi_url" class="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
          <span v-if="m.biaya" class="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <Receipt class="w-4 h-4" />
            {{ formatRupiah(m.biaya) }}
          </span>
          <button
            v-if="m.resi_url"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
            @click="m.showResi = !m.showResi"
          >
            <Camera class="w-3.5 h-3.5" />
            {{ m.showResi ? 'Sembunyikan resi' : 'Lihat foto resi' }}
          </button>
          <img
            v-if="m.showResi && m.resi_url"
            :src="m.resi_url"
            class="w-full max-h-44 rounded-lg object-cover border border-emerald-100"
            alt="Foto resi pengeluaran"
          />
        </div>

        <p v-if="m.catatan" class="mt-3 text-sm text-gray-600 line-clamp-2">{{ m.catatan }}</p>

        <div class="mt-4 flex items-center gap-2">
          <button
            v-if="m.status === 'terjadwal'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition disabled:opacity-60"
            :disabled="statusLoadingId === m.id"
            @click="changeStatus(m, 'berlangsung')"
          >
            <Loader2 v-if="statusLoadingId === m.id" class="w-3.5 h-3.5 animate-spin" />
            <Play v-else class="w-3.5 h-3.5" />
            Mulai
          </button>
          <button
            v-if="m.status === 'berlangsung'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
            @click="openComplete(m)"
          >
            <CheckCircle2 class="w-3.5 h-3.5" />
            Selesaikan
          </button>
          <span v-if="m.status === 'selesai'" class="inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 class="w-3.5 h-3.5" />
            Maintenance selesai
          </span>
          <div class="ml-auto flex items-center gap-1">
            <button class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Edit" @click="openEdit(m)">
              <Pencil class="w-4 h-4" />
            </button>
            <button class="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Hapus" @click="remove(m)">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="!filtered.length && !loading" class="md:col-span-2 py-12 text-center">
        <Wrench class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">
          {{ items.length ? 'Tidak ada jadwal yang cocok.' : 'Belum ada jadwal. Klik "Buat Jadwal" untuk memulai.' }}
        </p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

    <!-- Pagination: 20 jadwal per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="jadwal" />

    <!-- Modal form -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">{{ editingId !== null ? 'Edit' : 'Buat' }} Jadwal Maintenance</h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" @click="showForm = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form class="px-6 py-5 overflow-y-auto grid sm:grid-cols-2 gap-4" @submit.prevent="submit">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Barang <span class="text-rose-500">*</span></label>
            <select
              v-model="form.barang_id"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">— Pilih Barang —</option>
              <option v-for="b in barangOptions" :key="b.value" :value="b.value">{{ b.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Jadwal <span class="text-rose-500">*</span></label>
            <input
              v-model="form.tanggal_jadwal"
              type="date"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jenis Maintenance</label>
            <select
              v-model="form.jenis_maintenance_id"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">— Pilih —</option>
              <option v-for="o in jenisMaintOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>

          <!-- Penanggung jawab: pilih salah satu staff ATAU vendor -->
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Penanggung Jawab <span class="text-rose-500">*</span>
              <span class="text-xs font-normal text-gray-400">— pilih salah satu</span>
            </label>
            <div class="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                class="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition"
                :class="form.assign_type === 'staff' ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                @click="setAssignType('staff')"
              >
                <User class="w-4 h-4" />
                Staff
              </button>
              <button
                type="button"
                class="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition"
                :class="form.assign_type === 'vendor' ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                @click="setAssignType('vendor')"
              >
                <Store class="w-4 h-4" />
                Vendor
              </button>
            </div>
            <select
              v-model="form.assign_value"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">— Pilih {{ form.assign_type === 'staff' ? 'Staff' : 'Vendor' }} —</option>
              <option
                v-for="o in (form.assign_type === 'staff' ? staffOptions : vendorOptions)"
                :key="o.value"
                :value="o.value"
              >
                {{ o.label }}
              </option>
            </select>
          </div>

          <!-- Biaya + foto resi (opsional saat buat/edit, wajib resi jika ada biaya) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Biaya Pengeluaran</label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
              <input
                v-model="form.biaya"
                type="number"
                min="0"
                placeholder="0"
                class="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Foto Resi</label>
            <div
              class="relative rounded-xl border-2 border-dashed p-2 text-center transition cursor-pointer"
              :class="form.resi_url ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-300 hover:border-red-400 hover:bg-red-50/30'"
              @click="pickResiForm"
            >
              <img v-if="form.resi_url" :src="form.resi_url" class="max-h-28 mx-auto rounded-lg object-cover" alt="Foto resi" />
              <div v-else class="py-3">
                <Camera v-if="!resiUploadingForm" class="w-5 h-5 mx-auto mb-1 text-gray-400" />
                <Loader2 v-else class="w-5 h-5 mx-auto mb-1 text-emerald-500 animate-spin" />
                <p class="text-xs text-gray-500">{{ resiUploadingForm ? 'Mengunggah…' : 'Wajib jika ada biaya (maks 5MB)' }}</p>
              </div>
              <button
                v-if="form.resi_url"
                type="button"
                class="absolute top-1 right-1 p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition"
                @click.stop="form.resi_url = ''"
              >
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
            <input ref="resiFormInput" type="file" accept="image/*" class="hidden" :disabled="resiUploadingForm" @change="onResiChange($event, 'form')" />
          </div>

          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              v-model="form.catatan"
              rows="3"
              placeholder="Catatan untuk staff / vendor…"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <p v-if="formError" class="sm:col-span-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{{ formError }}</p>

          <div class="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50" @click="showForm = false">
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
            >
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              {{ saving ? 'Menyimpan…' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal selesaikan: biaya + foto resi -->
    <div v-if="showComplete && completeTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="!completeSaving && (showComplete = false)" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900">Selesaikan Maintenance</h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" :disabled="completeSaving" @click="showComplete = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <p class="text-sm text-gray-600 mb-1">Barang: <b>{{ completeTarget.barang?.nama }}</b></p>
        <p class="text-xs text-gray-400 mb-4">Tanggal {{ formatTanggal(completeTarget.tanggal_jadwal) }}</p>

        <label class="block text-sm font-medium text-gray-700 mb-1">Biaya Pengeluaran</label>
        <div class="relative mb-4">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
          <input
            v-model="completeBiaya"
            type="number"
            min="0"
            placeholder="0"
            class="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <label class="block text-sm font-medium text-gray-700 mb-1">Foto Resi <span v-if="Number(completeBiaya) > 0" class="text-rose-500">*</span></label>
        <div
          class="relative rounded-xl border-2 border-dashed p-3 text-center transition cursor-pointer"
          :class="completeResi ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-300 hover:border-red-400 hover:bg-red-50/30'"
          @click="pickResiComplete"
        >
          <img v-if="completeResi" :src="completeResi" class="max-h-40 mx-auto rounded-lg object-cover" alt="Foto resi" />
          <div v-else class="py-4">
            <Camera v-if="!resiUploadingComplete" class="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <Loader2 v-else class="w-6 h-6 mx-auto mb-1 text-emerald-500 animate-spin" />
            <p class="text-xs text-gray-500">{{ resiUploadingComplete ? 'Mengunggah…' : 'Foto struk/resi pengeluaran (maks 5MB)' }}</p>
          </div>
        </div>
        <input ref="resiCompleteInput" type="file" accept="image/*" class="hidden" :disabled="resiUploadingComplete" @change="onResiChange($event, 'complete')" />

        <p v-if="completeError" class="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{{ completeError }}</p>

        <div class="mt-5 flex justify-end gap-3">
          <button class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50" :disabled="completeSaving" @click="showComplete = false">
            Batal
          </button>
          <button
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
            :disabled="completeSaving"
            @click="confirmComplete"
          >
            <Loader2 v-if="completeSaving" class="w-4 h-4 animate-spin" />
            <CheckCircle2 v-else class="w-4 h-4" />
            {{ completeSaving ? 'Menyimpan…' : 'Selesaikan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
