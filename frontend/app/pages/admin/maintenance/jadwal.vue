<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
  Store
} from 'lucide-vue-next'
import { useAdminService, type Maintenance } from '~/services/api/admin'

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
const form = ref({
  barang_id: '',
  tanggal_jadwal: '',
  staff_id: '',
  vendor_id: '',
  catatan: ''
})

const barangOptions = ref<{ value: number; label: string }[]>([])
const staffOptions = ref<{ value: number; label: string }[]>([])
const vendorOptions = ref<{ value: number; label: string }[]>([])
const statusLoadingId = ref<number | null>(null)

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

const counts = computed(() => ({
  total: items.value.length,
  terjadwal: items.value.filter((m) => m.status === 'terjadwal').length,
  berlangsung: items.value.filter((m) => m.status === 'berlangsung').length,
  selesai: items.value.filter((m) => m.status === 'selesai').length
}))

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    terjadwal: 'bg-amber-100 text-amber-800',
    berlangsung: 'bg-blue-100 text-blue-800',
    selesai: 'bg-emerald-100 text-emerald-800'
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
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
  const [barang, staff, vendor] = await Promise.all([
    admin.barang.list({ per_page: 100 }),
    admin.master.list('users', { role: 'staff_sarpras', per_page: 100 }),
    admin.master.list('vendor', { per_page: 100 })
  ])
  barangOptions.value = barang.data.map((b: any) => ({ value: b.id, label: b.nama }))
  staffOptions.value = staff.data.map((u: any) => ({ value: u.id, label: u.name }))
  vendorOptions.value = vendor.data.map((v: any) => ({ value: v.id, label: v.nama }))
}

function resetForm() {
  form.value = { barang_id: '', tanggal_jadwal: '', staff_id: '', vendor_id: '', catatan: '' }
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
  form.value = {
    barang_id: String(m.barang_id ?? ''),
    tanggal_jadwal: m.tanggal_jadwal ?? '',
    staff_id: m.staff_id ? String(m.staff_id) : '',
    vendor_id: m.vendor_id ? String(m.vendor_id) : '',
    catatan: m.catatan ?? ''
  }
  showForm.value = true
}

async function submit() {
  if (!form.value.barang_id || !form.value.tanggal_jadwal) {
    formError.value = 'Barang dan tanggal jadwal wajib diisi.'
    return
  }
  saving.value = true
  formError.value = null
  try {
    const body = {
      barang_id: Number(form.value.barang_id),
      tanggal_jadwal: form.value.tanggal_jadwal,
      staff_id: form.value.staff_id ? Number(form.value.staff_id) : null,
      vendor_id: form.value.vendor_id ? Number(form.value.vendor_id) : null,
      catatan: form.value.catatan || null
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

async function changeStatus(m: Maintenance, status: 'berlangsung' | 'selesai') {
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
        <h2 class="text-2xl font-bold text-gray-900">Jadwal Maintenance</h2>
        <p class="text-sm text-gray-500 mt-1">Kelola jadwal maintenance berkala barang.</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
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
      <div class="bg-blue-50 rounded-2xl border border-blue-100 p-4">
        <div class="text-xs font-medium text-blue-600 uppercase tracking-wide">Berlangsung</div>
        <div class="text-2xl font-bold text-blue-700 mt-1">{{ counts.berlangsung }}</div>
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
          class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in statusOptions"
          :key="s.v"
          class="px-3 py-1.5 rounded-full text-sm font-medium border transition"
          :class="filterStatus === s.v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
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
        v-for="m in filtered"
        :key="m.id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <CalendarClock class="w-5 h-5 text-blue-600" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ formatTanggal(m.tanggal_jadwal) }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="statusBadge(m.status)">{{ m.status }}</span>
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

        <p v-if="m.catatan" class="mt-3 text-sm text-gray-600 line-clamp-2">{{ m.catatan }}</p>

        <div class="mt-4 flex items-center gap-2">
          <button
            v-if="m.status === 'terjadwal'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60"
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
            :disabled="statusLoadingId === m.id"
            @click="changeStatus(m, 'selesai')"
          >
            <Loader2 v-if="statusLoadingId === m.id" class="w-3.5 h-3.5 animate-spin" />
            <CheckCircle2 v-else class="w-3.5 h-3.5" />
            Selesaikan
          </button>
          <span v-if="m.status === 'selesai'" class="inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <CheckCircle2 class="w-3.5 h-3.5" />
            Maintenance selesai
          </span>
          <div class="ml-auto flex items-center gap-1">
            <button class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Edit" @click="openEdit(m)">
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
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Staff (opsional)</label>
            <select
              v-model="form.staff_id"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Pilih Staff —</option>
              <option v-for="s in staffOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Vendor (opsional)</label>
            <select
              v-model="form.vendor_id"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">— Pilih Vendor —</option>
              <option v-for="v in vendorOptions" :key="v.value" :value="v.value">{{ v.label }}</option>
            </select>
          </div>

          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              v-model="form.catatan"
              rows="3"
              placeholder="Catatan untuk staff / vendor…"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            >
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              {{ saving ? 'Menyimpan…' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
