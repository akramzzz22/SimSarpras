<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Inbox,
  Users,
  GraduationCap,
  UserRound
} from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'
import { formatTanggal } from '~/utils/format'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Data Murid' })

const admin = useAdminService()

// ============ Tipe data ============
interface KelasItem {
  id: number
  nama: string
  jurusan_id?: number | null
  jurusan?: { id: number; nama: string } | null
}

interface MuridItem {
  id: number
  nis: string
  nama: string
  tempat_lahir?: string | null
  tanggal_lahir?: string | null
  jenis_kelamin?: 'L' | 'P' | null
  alamat?: string | null
  no_hp?: string | null
  tahun_masuk?: string | null
  kelas_id?: number | null
  jurusan_id?: number | null
  proli_id?: number | null
  kelas?: { id: number; nama: string } | null
  jurusan?: { id: number; nama: string } | null
  proli?: { id: number; nama: string } | null
}

interface Opt {
  value: number
  label: string
}

// ============ State ============
const kelasList = ref<KelasItem[]>([])
const muridList = ref<MuridItem[]>([])
const gurus = ref<{ name: string; kelas?: string | null }[]>([])

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)

const search = ref('')
const filterJurusan = ref('')
const jurusanOptions = ref<Opt[]>([])

// null = Semua tingkat
const selectedTingkat = ref<string | null>(null)
const selectedKelasId = ref<number | 'all'>('all')

const selectedIds = ref<number[]>([])

// State modal form
const showForm = ref(false)
const editingId = ref<number | null>(null)
const formError = ref<string | null>(null)
const form = ref({ nis: '', nama: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: '', alamat: '', no_hp: '', tahun_masuk: '', jurusan_id: '', kelas_id: '', proli_id: '' })
const kelasOptions = ref<Opt[]>([])
const proliOptions = ref<Opt[]>([])

// ============ Helper ============
/** Ambil tingkat (X / XI / XII) dari nama kelas, mis. "XI RPL 1" → "XI" */
function tingkatOf(nama?: string | null): string {
  const first = (nama ?? '').trim().split(/\s+/)[0] ?? ''
  if (/^XII/i.test(first)) return 'XII'
  if (/^XI/i.test(first)) return 'XI'
  if (/^X/i.test(first)) return 'X'
  return first.toUpperCase() || 'Lainnya'
}

const TINGKAT_ORDER = ['X', 'XI', 'XII']

// ============ Computed ============
const tingkatList = computed(() => {
  const set = new Set(kelasList.value.map((k) => tingkatOf(k.nama)))
  const order = [...TINGKAT_ORDER.filter((t) => set.has(t))]
  for (const t of set) if (!order.includes(t)) order.push(t)
  return order
})

const tingkatCount = computed(() => {
  const map = new Map<string, number>()
  for (const m of muridList.value) {
    const t = tingkatOf(m.kelas?.nama)
    map.set(t, (map.get(t) ?? 0) + 1)
  }
  return map
})

const kelasOfTingkat = computed(() =>
  kelasList.value
    .filter((k) => tingkatOf(k.nama) === selectedTingkat.value)
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
)

const kelasCount = computed(() => {
  const map = new Map<number, number>()
  for (const m of muridList.value) {
    if (m.kelas_id != null) map.set(m.kelas_id, (map.get(m.kelas_id) ?? 0) + 1)
  }
  return map
})

const selectedKelas = computed(() =>
  selectedKelasId.value === 'all' ? null : kelasList.value.find((k) => k.id === selectedKelasId.value) ?? null
)

const selectedKelasNama = computed(() => {
  if (!selectedTingkat.value) return 'Semua Kelas'
  return selectedKelas.value?.nama ?? 'Semua Kelas'
})

const waliKelas = computed(() => {
  if (!selectedKelas.value) return '—'
  const k = selectedKelas.value
  const match = gurus.value.find(
    (g) => g.kelas && g.kelas.toLowerCase() === k.nama.toLowerCase()
  )
  return match?.name ?? '—'
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  const jf = filterJurusan.value
  return muridList.value.filter((m) => {
    const matchKelas =
      selectedTingkat.value === null ||
      (selectedKelasId.value === 'all'
        ? tingkatOf(m.kelas?.nama) === selectedTingkat.value
        : m.kelas_id === selectedKelasId.value)
    const matchQ = !q || m.nama.toLowerCase().includes(q) || m.nis.toLowerCase().includes(q)
    const matchJ = !jf || m.jurusan_id === Number(jf)
    return matchKelas && matchQ && matchJ
  })
})

// ---- Pagination: 20 murid per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedFiltered = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

// Reset ke halaman pertama saat pencarian/filter/kelas berubah
watch(filtered, () => {
  page.value = 1
})

watch([selectedTingkat, selectedKelasId], () => {
  page.value = 1
})

const allSelected = computed(
  () => filtered.value.length > 0 && filtered.value.every((m) => selectedIds.value.includes(m.id))
)

function toggleAll() {
  if (allSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !filtered.value.some((m) => m.id === id))
  } else {
    const ids = new Set(selectedIds.value)
    for (const m of filtered.value) ids.add(m.id)
    selectedIds.value = [...ids]
  }
}

function toggleOne(id: number) {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((x) => x !== id)
    : [...selectedIds.value, id]
}

// ============ Data loading ============
async function loadKelas() {
  try {
    const res = await admin.master.list<KelasItem>('kelas', { per_page: 100 })
    kelasList.value = res.data
  } catch {
    // abaikan — daftar kelas kosong
  }
}

async function loadMurid() {
  loading.value = true
  error.value = null
  try {
    const all: MuridItem[] = []
    let p = 1
    for (;;) {
      const res = await admin.master.list<MuridItem>('murid', { per_page: 100, page: p })
      all.push(...res.data)
      if (p >= res.last_page) break
      p++
    }
    muridList.value = all
    // Default kelas terpilih: kelas pertama dari tingkat terpilih
    if (selectedKelasId.value === 'all' && selectedTingkat.value && kelasOfTingkat.value.length) {
      const first = kelasOfTingkat.value[0]
      if (first) selectedKelasId.value = first.id
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data murid.'
  } finally {
    loading.value = false
  }
}

async function loadGurus() {
  try {
    const res = await admin.master.list<{ name: string; kelas?: string | null }>('users', { role: 'guru', per_page: 100 })
    gurus.value = res.data
  } catch {
    gurus.value = []
  }
}

async function loadOptions() {
  try {
    const [j, p] = await Promise.all([
      admin.master.list('jurusan', { per_page: 100 }),
      admin.master.list('proli', { per_page: 100 })
    ])
    jurusanOptions.value = j.data.map((x: any) => ({ value: x.id, label: x.nama }))
    proliOptions.value = p.data.map((x: any) => ({ value: x.id, label: x.nama }))
  } catch {
    // abaikan
  }
}

async function loadKelasOptions() {
  kelasOptions.value = []
  if (!form.value.jurusan_id) return
  try {
    const res = await admin.master.list('kelas', { per_page: 100, jurusan_id: form.value.jurusan_id })
    kelasOptions.value = res.data.map((k: any) => ({ value: k.id, label: k.nama }))
  } catch {
    kelasOptions.value = []
  }
}

function selectSemua() {
  selectedTingkat.value = null
  selectedKelasId.value = 'all'
  selectedIds.value = []
}

function selectTingkat(t: string) {
  selectedTingkat.value = t
  const first = kelasList.value.find((k) => tingkatOf(k.nama) === t)
  selectedKelasId.value = first?.id ?? 'all'
  selectedIds.value = []
}

function selectKelas(id: number | 'all') {
  selectedKelasId.value = id
  selectedIds.value = []
}

// ============ CRUD ============
function resetForm() {
  form.value = { nis: '', nama: '', tempat_lahir: '', tanggal_lahir: '', jenis_kelamin: '', alamat: '', no_hp: '', tahun_masuk: '', jurusan_id: '', kelas_id: '', proli_id: '' }
  kelasOptions.value = []
}

function openCreate() {
  editingId.value = null
  resetForm()
  formError.value = null
  showForm.value = true
}

function openEdit(m: MuridItem) {
  editingId.value = m.id
  form.value = {
    nis: m.nis,
    nama: m.nama,
    tempat_lahir: m.tempat_lahir ?? '',
    tanggal_lahir: m.tanggal_lahir ? String(m.tanggal_lahir).slice(0, 10) : '',
    jenis_kelamin: m.jenis_kelamin ?? '',
    alamat: m.alamat ?? '',
    no_hp: m.no_hp ?? '',
    tahun_masuk: m.tahun_masuk ?? '',
    jurusan_id: m.jurusan_id != null ? String(m.jurusan_id) : '',
    kelas_id: m.kelas_id != null ? String(m.kelas_id) : '',
    proli_id: m.proli_id != null ? String(m.proli_id) : ''
  }
  formError.value = null
  showForm.value = true
  loadKelasOptions()
}

watch(
  () => form.value.jurusan_id,
  () => {
    // Reset kelas jika jurusan diubah
    if (editingId.value === null) form.value.kelas_id = ''
    loadKelasOptions()
  }
)

async function submit() {
  if (!form.value.nis.trim()) {
    formError.value = 'NIS wajib diisi.'
    return
  }
  if (!form.value.nama.trim()) {
    formError.value = 'Nama murid wajib diisi.'
    return
  }
  if (!form.value.kelas_id) {
    formError.value = 'Kelas wajib dipilih (pilih jurusan terlebih dahulu).'
    return
  }
  saving.value = true
  formError.value = null
  try {
    const body = {
      nis: form.value.nis,
      nama: form.value.nama,
      tempat_lahir: form.value.tempat_lahir.trim() || null,
      tanggal_lahir: form.value.tanggal_lahir || null,
      jenis_kelamin: form.value.jenis_kelamin || null,
      alamat: form.value.alamat.trim() || null,
      no_hp: form.value.no_hp.trim() || null,
      tahun_masuk: form.value.tahun_masuk.trim() || null,
      kelas_id: Number(form.value.kelas_id),
      jurusan_id: form.value.jurusan_id ? Number(form.value.jurusan_id) : null,
      proli_id: form.value.proli_id ? Number(form.value.proli_id) : null
    }
    if (editingId.value !== null) {
      await admin.master.update('murid', editingId.value, body)
    } else {
      await admin.master.create('murid', body)
    }
    showForm.value = false
    await loadMurid()
  } catch (e: any) {
    const err = e?.data?.errors
    const firstKey = err ? Object.keys(err)[0] : null
    formError.value =
      (firstKey && err[firstKey]?.[0]) || e?.data?.message || 'Gagal menyimpan data.'
  } finally {
    saving.value = false
  }
}

async function remove(m: MuridItem) {
  if (!confirm(`Yakin ingin menghapus murid ${m.nama}?`)) return
  try {
    await admin.master.remove('murid', m.id)
    selectedIds.value = selectedIds.value.filter((id) => id !== m.id)
    await loadMurid()
  } catch {
    alert('Gagal menghapus data. Pastikan data tidak sedang dipakai.')
  }
}

function statusBadge(m: MuridItem) {
  return m.jurusan?.nama ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
}

onMounted(() => {
  loadKelas()
  loadMurid()
  loadGurus()
  loadOptions()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Data Murid</h2>
        <p class="text-sm text-gray-500 mt-0.5">
          Kelola data murid per kelas. Akun login dibuat otomatis — kelola di Pengaturan → Akun.
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition shadow-sm"
        style="background-color: #1D4ED8; color: #ffffff; border: 1px solid #1D4ED8;"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" />
        Tambah Murid
      </button>
    </div>

    <!-- ============ Tab Tingkat: Kelas X / XI / XII (di dalam konten) ============ -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border transition shrink-0"
        :style="selectedTingkat === null ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' } : { borderColor: '#D1D5DB', color: '#4B5563', backgroundColor: '#ffffff' }"
        @click="selectSemua"
      >
        <Users class="w-3.5 h-3.5" />
        Semua
        <span class="text-2xs px-1.5 py-0.5 rounded" :style="selectedTingkat === null ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: '#F3F4F6', color: '#6B7280' }">
          {{ muridList.length }}
        </span>
      </button>

      <button
        v-for="t in tingkatList"
        :key="t"
        type="button"
        class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold border transition shrink-0"
        :style="selectedTingkat === t ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' } : { borderColor: '#D1D5DB', color: '#4B5563', backgroundColor: '#ffffff' }"
        @click="selectTingkat(t)"
      >
        <GraduationCap class="w-3.5 h-3.5" />
        Kelas {{ t }}
        <span class="text-2xs px-1.5 py-0.5 rounded" :style="selectedTingkat === t ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: '#F3F4F6', color: '#6B7280' }">
          {{ tingkatCount.get(t) ?? 0 }}
        </span>
      </button>
    </div>

    <!-- ============ Chip Kelas (saat tingkat dipilih) ============ -->
    <div v-if="selectedTingkat" class="flex items-center gap-2 overflow-x-auto pb-1">
      <span class="text-2xs font-semibold uppercase tracking-wide shrink-0" style="color: #9CA3AF;">Kelas:</span>
      <button
        type="button"
        class="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border transition shrink-0"
        :style="selectedKelasId === 'all' ? { backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' } : { borderColor: '#D1D5DB', color: '#4B5563', backgroundColor: '#ffffff' }"
        @click="selectKelas('all')"
      >
        Semua Kelas
        <span class="text-2xs" :style="selectedKelasId === 'all' ? { color: '#1D4ED8' } : { color: '#9CA3AF' }">
          {{ tingkatCount.get(selectedTingkat) ?? 0 }}
        </span>
      </button>
      <button
        v-for="k in kelasOfTingkat"
        :key="k.id"
        type="button"
        class="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border transition shrink-0"
        :style="selectedKelasId === k.id ? { backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' } : { borderColor: '#D1D5DB', color: '#4B5563', backgroundColor: '#ffffff' }"
        @click="selectKelas(k.id)"
      >
        {{ k.nama }}
        <span class="text-2xs" :style="selectedKelasId === k.id ? { color: '#1D4ED8' } : { color: '#9CA3AF' }">
          {{ kelasCount.get(k.id) ?? 0 }}
        </span>
      </button>
    </div>

    <!-- Filter -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Cari nama atau NIS…"
          class="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style="border-color: #D1D5DB;"
        />
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="filterJurusan"
          class="rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-600 outline-none"
          style="border-color: #D1D5DB;"
          title="Filter jurusan"
        >
          <option value="">Semua Jurusan</option>
          <option v-for="o in jurusanOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <button class="p-2.5 rounded-lg border bg-white text-gray-500 hover:bg-gray-50 transition" style="border-color: #D1D5DB;" title="Muat ulang" @click="loadMurid">
          <RefreshCw class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Info kelas -->
    <div class="bg-white px-5 py-4 flex flex-wrap gap-x-10 gap-y-3" style="border: 1px solid #D1D5DB; border-radius: 8px;">
      <div class="min-w-[140px]">
        <div class="text-2xs font-semibold uppercase tracking-wide" style="color: #9CA3AF;">Kelas</div>
        <div class="font-semibold mt-0.5" style="color: #0F172A;">{{ selectedKelasNama }}</div>
      </div>
      <div class="min-w-[140px]">
        <div class="text-2xs font-semibold uppercase tracking-wide" style="color: #9CA3AF;">Wali Kelas</div>
        <div class="font-medium mt-0.5" style="color: #4B5563;">{{ waliKelas }}</div>
      </div>
      <div class="min-w-[140px]">
        <div class="text-2xs font-semibold uppercase tracking-wide" style="color: #9CA3AF;">Jumlah Murid</div>
        <div class="font-semibold mt-0.5" style="color: #0F172A;">{{ filtered.length }} <span class="text-xs font-normal" style="color: #9CA3AF;">murid</span></div>
      </div>
    </div>

    <p v-if="error" class="text-sm font-medium" style="border: 1px solid #FECACA; background-color: #FEF2F2; color: #DC2626; border-radius: 8px; padding: 10px 14px;">
      {{ error }}
    </p>

    <!-- Tabel full-width boxed -->
    <div class="overflow-hidden" style="border: 1px solid #D1D5DB; border-radius: 8px; background-color: #ffffff;">
      <div v-if="selectedIds.length" class="px-4 py-2 text-xs font-medium flex items-center gap-2" style="border-bottom: 1px solid #FECACA; background-color: #FEF2F2; color: #DC2626;">
        <UserRound class="w-3.5 h-3.5" />
        {{ selectedIds.length }} murid dipilih
      </div>
      <div class="overflow-x-auto">
        <table class="w-full" style="border-collapse: collapse;">
          <thead>
            <tr style="background-color: #F8F9FA;">
              <th style="padding: 10px 14px; width: 40px; border-bottom: 1px solid #E5E7EB; text-align: left;">
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded"
                  style="accent-color: #1D4ED8;"
                  :checked="allSelected"
                  :disabled="!filtered.length"
                  @change="toggleAll"
                />
              </th>
              <th style="padding: 10px 14px; width: 48px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">No.</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">NIS</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">Nama Murid</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: center;">JK</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">Tempat, Tgl Lahir</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">No. HP</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: center;">Tahun Masuk</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">Jurusan</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">Proli</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: right;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, i) in pagedFiltered" :key="m.id" style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 14px;">
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded"
                  style="accent-color: #1D4ED8;"
                  :checked="selectedIds.includes(m.id)"
                  @change="toggleOne(m.id)"
                />
              </td>
              <td style="padding: 10px 14px; color: #9CA3AF;">{{ (page - 1) * PER_PAGE + i + 1 }}</td>
              <td style="padding: 10px 14px;">
                <span class="font-mono text-xs" style="color: #4B5563;">{{ m.nis }}</span>
              </td>
              <td style="padding: 10px 14px;">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style="background-color: #EFF6FF; color: #1D4ED8;">
                    <UserRound class="w-4 h-4" />
                  </div>
                  <span class="font-medium" style="color: #0F172A;">{{ m.nama }}</span>
                </div>
              </td>
              <td style="padding: 10px 14px; text-align: center;">
                <span class="text-xs px-2 py-1 rounded font-semibold" :class="m.jenis_kelamin === 'L' ? 'bg-blue-50 text-blue-700' : m.jenis_kelamin === 'P' ? 'bg-pink-50 text-pink-700' : 'bg-gray-100 text-gray-400'">
                  {{ m.jenis_kelamin === 'L' ? 'L' : m.jenis_kelamin === 'P' ? 'P' : '—' }}
                </span>
              </td>
              <td style="padding: 10px 14px; color: #4B5563; white-space: nowrap;">
                <template v-if="m.tempat_lahir || m.tanggal_lahir">
                  {{ [m.tempat_lahir, m.tanggal_lahir ? formatTanggal(m.tanggal_lahir) : null].filter(Boolean).join(', ') }}
                </template>
                <span v-else style="color: #9CA3AF;">—</span>
              </td>
              <td style="padding: 10px 14px; color: #4B5563; white-space: nowrap;">{{ m.no_hp ?? '—' }}</td>
              <td style="padding: 10px 14px; text-align: center; color: #4B5563;">{{ m.tahun_masuk ?? '—' }}</td>
              <td style="padding: 10px 14px;">
                <span class="text-xs px-2 py-1 rounded font-semibold" :class="statusBadge(m)">
                  {{ m.jurusan?.nama ?? '—' }}
                </span>
              </td>
              <td style="padding: 10px 14px; color: #4B5563;">{{ m.proli?.nama ?? '—' }}</td>
              <td class="text-right whitespace-nowrap" style="padding: 10px 14px;">
                <button class="p-1.5 rounded-lg transition ml-1" style="color: #9CA3AF;" title="Edit" @click="openEdit(m)">
                  <Pencil class="w-4 h-4" />
                </button>
                <button class="p-1.5 rounded-lg transition ml-1" style="color: #9CA3AF;" title="Hapus" @click="remove(m)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td :colspan="11" style="padding: 40px 14px; text-align: center; color: #9CA3AF;">
                <Inbox class="w-8 h-8 mx-auto mb-2" style="color: #D1D5DB;" />
                {{ muridList.length ? 'Tidak ada murid yang cocok.' : 'Belum ada data murid. Klik "Tambah Murid" untuk memulai.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" style="padding: 20px 14px; text-align: center; font-size: 14px; color: #9CA3AF;">Memuat data…</div>
    </div>

    <!-- Pagination: 20 murid per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="murid" />

    <!-- ============ Modal form ============ -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
      <div class="relative bg-white shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" style="border-radius: 10px;">
        <div class="flex items-center justify-between px-6 py-4" style="border-bottom: 1px solid #E5E7EB;">
          <h3 class="font-semibold" style="color: #0F172A;">
            {{ editingId !== null ? 'Edit' : 'Tambah' }} Murid
          </h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" @click="showForm = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form class="px-6 py-5 overflow-y-auto grid sm:grid-cols-2 gap-4" @submit.prevent="submit">
          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">
              NIS <span style="color: #DC2626;">*</span>
            </label>
            <input
              v-model="form.nis"
              required
              placeholder="Contoh: 1234567890"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">
              Nama Lengkap <span style="color: #DC2626;">*</span>
            </label>
            <input
              v-model="form.nama"
              required
              placeholder="Contoh: Budi Santoso"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Jenis Kelamin</label>
            <select
              v-model="form.jenis_kelamin"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none bg-white"
              style="border-color: #D1D5DB;"
            >
              <option value="">— Pilih —</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Tahun Masuk</label>
            <input
              v-model="form.tahun_masuk"
              placeholder="Contoh: 2025"
              maxlength="4"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Tempat Lahir</label>
            <input
              v-model="form.tempat_lahir"
              placeholder="Contoh: Bandung"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Tanggal Lahir</label>
            <input
              v-model="form.tanggal_lahir"
              type="date"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">No. HP</label>
            <input
              v-model="form.no_hp"
              placeholder="Contoh: 081234567890"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Alamat</label>
            <textarea
              v-model="form.alamat"
              rows="2"
              placeholder="Alamat lengkap tempat tinggal…"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none resize-none"
              style="border-color: #D1D5DB;"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Jurusan</label>
            <select
              v-model="form.jurusan_id"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none bg-white"
              style="border-color: #D1D5DB;"
            >
              <option value="">— Pilih Jurusan —</option>
              <option v-for="o in jurusanOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <p class="mt-1 text-2xs" style="color: #9CA3AF;">Pilih jurusan terlebih dahulu, lalu pilih kelasnya.</p>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">
              Kelas <span style="color: #DC2626;">*</span>
            </label>
            <select
              v-model="form.kelas_id"
              :disabled="!form.jurusan_id"
              required
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
              style="border-color: #D1D5DB;"
            >
              <option value="">{{ form.jurusan_id ? '— Pilih Kelas —' : 'Pilih jurusan terlebih dahulu' }}</option>
              <option v-for="o in kelasOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Proli</label>
            <select
              v-model="form.proli_id"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none bg-white"
              style="border-color: #D1D5DB;"
            >
              <option value="">— Pilih Proli (opsional) —</option>
              <option v-for="o in proliOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>

          <p v-if="formError" class="sm:col-span-2 text-sm font-medium" style="border: 1px solid #FECACA; background-color: #FEF2F2; color: #DC2626; border-radius: 8px; padding: 8px 12px;">
            {{ formError }}
          </p>

          <div class="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              class="px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-gray-50"
              style="border-color: #D1D5DB;"
              @click="showForm = false"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-60"
              style="background-color: #1D4ED8; color: #ffffff; border: 1px solid #1D4ED8;"
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
