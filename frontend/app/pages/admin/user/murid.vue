<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  KeyRound,
  RefreshCw,
  EyeOff,
  Copy,
  Check,
  X,
  Search,
  Users,
  Loader2,
  Power,
  PowerOff,
  UserRound,
  Plus,
  Play,
  Star,
  CalendarDays
} from 'lucide-vue-next'
import { useAdminService, type UserItem, type AkunMurid } from '~/services/api/admin'
import { useTahunAjaran } from '~/composables/useTahunAjaran'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'User Murid' })

const admin = useAdminService()
const { aktif: taAktif } = useTahunAjaran()

// ============================================================
// Data & filter
// ============================================================
const users = ref<UserItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Halaman khusus murid — role dikunci ke 'murid'
const roleFilter = ref<'murid'>('murid')
const jenjangFilter = ref('')
const kelasFilter = ref('')
const search = ref('')

const jurusanOptions = ref<{ value: number; label: string }[]>([])

const kelasOptions = computed(() =>
  [...new Set(users.value.map((u) => u.kelas).filter((k): k is string => !!k))].sort()
)

const filtered = computed(() =>
  users.value.filter((u) => {
    if (jenjangFilter.value && u.jurusan_id !== Number(jenjangFilter.value)) return false
    if (kelasFilter.value && u.kelas !== kelasFilter.value) return false
    const q = search.value.toLowerCase()
    if (
      q &&
      !u.name.toLowerCase().includes(q) &&
      !(u.email ?? '').toLowerCase().includes(q) &&
      !(u.murid?.nis ?? '').toLowerCase().includes(q)
    ) {
      return false
    }
    return true
  })
)

// ---- Pagination: 20 akun per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedUsers = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

// Reset halaman saat pencarian/filter berubah
watch(filtered, () => {
  page.value = 1
})

const countLabel = computed(() =>
  roleFilter.value === 'murid' ? `Peserta Didik : ${users.value.length} Orang` : `Pengguna : ${users.value.length} Orang`
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const params: Record<string, any> = { per_page: 500, role: 'murid' }
    const res = await admin.master.list<UserItem>('users', params)
    users.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data akun.'
  } finally {
    loading.value = false
  }
}

async function loadJurusan() {
  try {
    const res = await admin.master.list('jurusan', { per_page: 100 })
    jurusanOptions.value = res.data.map((j: any) => ({ value: j.id, label: j.nama }))
  } catch {
    jurusanOptions.value = []
  }
}

// roleFilter dikunci murid — tidak perlu watch

onMounted(() => {
  loadJurusan()
  load()
})

// ============================================================
// Helper tampilan
// ============================================================
const idPembelajaran = (u: UserItem) => `PD-${String(u.id).padStart(3, '0')}`
const initial = (u: UserItem) => (u.name || '?').charAt(0).toUpperCase()
const nis = (u: UserItem) => u.murid?.nis || '—'
const jenkelLabel = (u: UserItem) => (u.jenis_kelamin === 'L' ? 'L' : u.jenis_kelamin === 'P' ? 'P' : '—')

// ============================================================
// Aksi akun (generate / lihat / reset)
// ============================================================
const akunResult = ref<AkunMurid | null>(null)
const akunMode = ref<'buat' | 'lihat' | 'reset' | null>(null)
const genError = ref<string | null>(null)
const copied = ref(false)
const actionId = ref<number | null>(null)

function closeAkunModal() {
  akunResult.value = null
  akunMode.value = null
  genError.value = null
  copied.value = false
}

async function buatAkun(u: UserItem) {
  actionId.value = u.id
  genError.value = null
  try {
    const res = await admin.akun.generate(u.id)
    akunResult.value = res
    akunMode.value = 'buat'
    await load()
  } catch (e: any) {
    genError.value = e?.data?.message ?? 'Gagal membuat akun.'
  } finally {
    actionId.value = null
  }
}

async function lihatPassword(u: UserItem) {
  genError.value = null
  try {
    const res = await admin.akun.lihatPassword(u.id)
    akunResult.value = res
    akunMode.value = 'lihat'
  } catch (e: any) {
    genError.value = e?.data?.message ?? 'Gagal memuat password.'
  }
}

async function resetPassword(u: UserItem) {
  if (!confirm(`Reset password akun "${u.name}"? Password lama akan langsung tidak berlaku.`)) return
  genError.value = null
  try {
    const res = await admin.akun.resetPassword(u.id)
    akunResult.value = res
    akunMode.value = 'reset'
    await load()
  } catch (e: any) {
    genError.value = e?.data?.message ?? 'Gagal reset password.'
  }
}

async function toggleAktif(u: UserItem) {
  actionId.value = u.id
  genError.value = null
  try {
    await admin.akun.toggleAktif(u.id)
    await load()
  } catch (e: any) {
    genError.value = e?.data?.message ?? 'Gagal mengubah status akun.'
  } finally {
    actionId.value = null
  }
}

// ============================================================
// Create All Akun (generate akun untuk murid tanpa email)
// ============================================================
const creatingAll = ref(false)
const createAllProgress = ref({ done: 0, total: 0 })
const createAllResult = ref<{ dibuat: number; gagal: number } | null>(null)

async function createAll() {
  const tanpaAkun = users.value.filter((u) => !u.email)
  if (!tanpaAkun.length) {
    genError.value = 'Semua akun sudah memiliki email & password.'
    return
  }
  if (!confirm(`Buat akun otomatis untuk ${tanpaAkun.length} murid yang belum punya akun?`)) return

  creatingAll.value = true
  createAllProgress.value = { done: 0, total: tanpaAkun.length }
  createAllResult.value = null
  let dibuat = 0
  let gagal = 0
  for (const u of tanpaAkun) {
    try {
      await admin.akun.generate(u.id)
      dibuat++
    } catch {
      gagal++
    }
    createAllProgress.value = { ...createAllProgress.value, done: createAllProgress.value.done + 1 }
  }
  createAllResult.value = { dibuat, gagal }
  creatingAll.value = false
  await load()
}

// ============================================================
// Tambah akun manual (modal)
// ============================================================
const showCreate = ref(false)
const createForm = ref({
  name: '',
  email: '',
  password: '',
  role: 'murid',
  kelas: '',
  jurusan_id: '',
  jenis_kelamin: ''
})
const createSaving = ref(false)
const createError = ref<string | null>(null)

async function submitCreate() {
  createError.value = null
  if (!createForm.value.name.trim() || !createForm.value.email.trim() || !createForm.value.password) {
    createError.value = 'Nama, email, dan password wajib diisi.'
    return
  }
  createSaving.value = true
  try {
    await admin.master.create('users', {
      name: createForm.value.name.trim(),
      email: createForm.value.email.trim(),
      password: createForm.value.password,
      role: createForm.value.role,
      kelas: createForm.value.kelas.trim() || null,
      jurusan_id: createForm.value.jurusan_id ? Number(createForm.value.jurusan_id) : null,
      jenis_kelamin: createForm.value.jenis_kelamin || null
    })
    showCreate.value = false
    createForm.value = { name: '', email: '', password: '', role: 'murid', kelas: '', jurusan_id: '', jenis_kelamin: '' }
    await load()
  } catch (e: any) {
    createError.value = e?.data?.message ?? 'Gagal membuat akun.'
  } finally {
    createSaving.value = false
  }
}

async function copyAkun() {
  if (!akunResult.value) return
  const text = `Nama: ${akunResult.value.nama}\nEmail: ${akunResult.value.email}\nPassword: ${akunResult.value.password}`
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // clipboard tidak tersedia
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">User Murid</h2>
        <p class="text-2xs text-gray-500 mt-0.5">
          Kelola akun login peserta didik — buat, lihat/reset password, aktif/nonaktifkan.
        </p>
      </div>
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-2xs text-gray-600">
        <Star class="w-3.5 h-3.5 text-amber-500" />
        User Murid
      </div>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>
    <p v-if="genError && !akunResult" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ genError }}</p>

    <!-- Bar filter & aksi -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="text-2xs font-medium text-gray-500 self-center pb-2.5">Detail Akun Murid :</div>

        <!-- Jenjang -->
        <div>
          <label class="text-2xs font-medium text-gray-400 mb-1 block">Jenjang</label>
          <select
            v-model="jenjangFilter"
            class="control"
          >
            <option value="">— Semua Jenjang —</option>
            <option v-for="j in jurusanOptions" :key="j.value" :value="j.value">{{ j.label }}</option>
          </select>
        </div>

        <!-- Kelas -->
        <div>
          <label class="text-2xs font-medium text-gray-400 mb-1 block">Kelas</label>
          <select
            v-model="kelasFilter"
            class="control"
          >
            <option value="">— Semua Kelas —</option>
            <option v-for="k in kelasOptions" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>

        <!-- Create All Akun -->
        <button
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-300 text-blue-600 font-semibold hover:bg-blue-50 transition disabled:opacity-60"
          :disabled="creatingAll"
          @click="createAll"
        >
          <Loader2 v-if="creatingAll" class="w-4 h-4 animate-spin" />
          <Play v-else class="w-4 h-4" />
          {{ creatingAll ? `Membuat ${createAllProgress.done}/${createAllProgress.total}…` : 'Create All Akun' }}
        </button>

        <div class="flex-1" />

        <!-- Cari -->
        <div class="relative">
          <input
            v-model="search"
            placeholder="Cari Murid"
            class="w-52 rounded-md border border-gray-200 pl-9 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-red-500"
          />
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <!-- Info jumlah -->
        <div class="inline-flex items-center gap-1.5 rounded-md bg-gray-50 border border-gray-200 px-3 py-1.5 text-2xs font-medium text-gray-600">
          <Users class="w-3.5 h-3.5 text-gray-400" />
          {{ countLabel }}
        </div>

        <!-- Tahun Ajaran aktif -->
        <div
          class="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-3 py-1.5 text-2xs font-medium text-blue-700"
          title="Tahun ajaran aktif saat ini"
        >
          <CalendarDays class="w-3.5 h-3.5" />
          {{ taAktif?.label || 'TA aktif' }}
        </div>

        <!-- Tambah akun -->
        <button
          class="btn-primary"
          @click="showCreate = true"
        >
          <Plus class="w-4 h-4" />
          Tambah Akun
        </button>
      </div>
    </div>

    <!-- Hasil Create All -->
    <div v-if="createAllResult" class="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <span>
        <b>{{ createAllResult.dibuat }}</b> akun berhasil dibuat
        <template v-if="createAllResult.gagal">, <b class="text-rose-600">{{ createAllResult.gagal }}</b> gagal</template>.
      </span>
      <button class="text-xs font-semibold text-emerald-700 hover:underline" @click="createAllResult = null">Tutup</button>
    </div>

    <!-- Tabel -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1100px]">
          <thead>
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <th rowspan="2" class="px-4 py-3 text-left font-semibold w-12">No.</th>
              <th rowspan="2" class="px-4 py-3 text-left font-semibold w-24">ID PD</th>
              <th rowspan="2" class="px-4 py-3 text-center font-semibold w-20">Foto PD</th>
              <th rowspan="2" class="px-4 py-3 text-left font-semibold">Nama Lengkap</th>
              <th rowspan="2" class="px-4 py-3 text-center font-semibold w-16">Jenis<br />Kelamin</th>
              <th rowspan="2" class="px-4 py-3 text-left font-semibold w-28">Kelas</th>
              <th rowspan="2" class="px-4 py-3 text-left font-semibold w-44">Username</th>
              <th rowspan="2" class="px-4 py-3 text-center font-semibold w-28">Password</th>
              <th rowspan="2" class="px-4 py-3 text-center font-semibold w-20">Reset</th>
              <th colspan="2" class="px-4 py-3 text-center font-semibold border-l border-gray-200">Informasi Akun</th>
            </tr>
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <th class="px-4 py-2 text-center font-semibold border-l border-gray-200">Aksi Status</th>
              <th class="px-4 py-2 text-center font-semibold">Gagal Login</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="11" class="px-4 py-12 text-center text-gray-400 text-xs">Memuat data…</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="11" class="px-4 py-12 text-center text-gray-400 text-xs">Tidak ada data murid.</td>
            </tr>
            <tr v-for="(u, idx) in pagedUsers" :key="u.id" class="border-t border-gray-200 hover:bg-gray-50/50 transition">
              <!-- No -->
              <td class="px-4 py-3 text-gray-500">{{ (page - 1) * PER_PAGE + idx + 1 }}</td>

              <!-- ID PD -->
              <td class="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{{ idPembelajaran(u) }}</td>

              <!-- Foto PD -->
              <td class="px-4 py-3 text-center">
                <img
                  v-if="u.foto"
                  :src="u.foto"
                  class="w-9 h-9 rounded-full object-cover mx-auto border border-gray-200"
                  alt="Foto"
                />
                <div v-else class="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto">
                  <UserRound class="w-4 h-4 text-gray-400" />
                </div>
              </td>

              <!-- Nama lengkap + NIS -->
              <td class="px-4 py-3">
                <div class="font-semibold text-gray-900">{{ u.name }}</div>
                <div class="text-2xs text-gray-400">{{ nis(u) }}</div>
              </td>

              <!-- Jenis kelamin -->
              <td class="px-4 py-3 text-center text-gray-700">{{ jenkelLabel(u) }}</td>

              <!-- Kelas -->
              <td class="px-4 py-3 text-gray-700 whitespace-nowrap">{{ u.kelas || '—' }}</td>

              <!-- Username -->
              <td class="px-4 py-3">
                <template v-if="u.email">
                  <span class="text-gray-700 font-mono text-xs">{{ u.email }}</span>
                </template>
                <button
                  v-else
                  class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                  :disabled="actionId === u.id"
                  @click="buatAkun(u)"
                >
                  <Loader2 v-if="actionId === u.id" class="w-3.5 h-3.5 animate-spin" />
                  <KeyRound v-else class="w-3.5 h-3.5" />
                  Buat Akun
                </button>
              </td>

              <!-- Password -->
              <td class="px-4 py-3 text-center">
                <button
                  v-if="u.email"
                  class="inline-flex items-center gap-1.5 text-gray-400 hover:text-violet-600 transition"
                  title="Lihat Password"
                  @click="lihatPassword(u)"
                >
                  <span class="tracking-widest text-xs">••••••••</span>
                  <EyeOff class="w-3.5 h-3.5" />
                </button>
                <span v-else class="text-gray-300">—</span>
              </td>

              <!-- Reset -->
              <td class="px-4 py-3 text-center">
                <button
                  v-if="u.email"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 text-gray-600 text-xs font-medium hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-50"
                  :disabled="actionId === u.id"
                  @click="resetPassword(u)"
                >
                  <RefreshCw class="w-3 h-3" />
                  Reset
                </button>
                <span v-else class="text-gray-300">—</span>
              </td>

              <!-- Aksi status -->
              <td class="px-4 py-3 border-l border-gray-200">
                <div class="flex items-center gap-1.5">
                  <button
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition disabled:opacity-50"
                    :class="u.is_active === false ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-700'"
                    :disabled="actionId === u.id"
                    @click="toggleAktif(u)"
                  >
                    <Power v-if="u.is_active !== false" class="w-3 h-3" />
                    <PowerOff v-else class="w-3 h-3" />
                    {{ u.is_active === false ? 'Aktifkan' : 'Aktif' }}
                  </button>
                  <button
                    v-if="u.is_active !== false"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition disabled:opacity-50"
                    :disabled="actionId === u.id"
                    @click="toggleAktif(u)"
                  >
                    <PowerOff class="w-3 h-3" />
                    Nonaktifkan
                  </button>
                </div>
              </td>

              <!-- Gagal login -->
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex px-2 py-1 rounded text-2xs font-semibold"
                  :class="(u.failed_login_count ?? 0) > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'"
                >
                  {{ u.failed_login_count ?? 0 }} Kali
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination: 20 akun per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="akun" />

    <!-- Modal hasil generate / lihat / reset password -->
    <div v-if="akunResult" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeAkunModal" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <KeyRound class="w-5 h-5 text-emerald-600" />
            {{ akunMode === 'buat' ? 'Akun Berhasil Dibuat' : akunMode === 'reset' ? 'Password Di-reset' : 'Lihat Password' }}
          </h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" @click="closeAkunModal">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="px-6 py-5 space-y-3">
          <p
            class="text-sm rounded-lg px-3 py-2 border"
            :class="akunMode === 'reset' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'"
          >
            <strong>{{ akunMode === 'reset' ? 'Password baru:' : akunMode === 'lihat' ? 'Password saat ini:' : 'Catatan:' }}</strong>
            {{ akunMode === 'reset'
              ? 'Password lama sudah tidak berlaku. Password baru hanya ditampilkan sekali ini — simpan & bagikan ke pengguna.'
              : akunMode === 'lihat'
                ? 'Password ini disimpan sementara khusus admin. Simpan & bagikan ke pengguna.'
                : 'Password hanya ditampilkan sekali ini. Simpan & bagikan ke pengguna.' }}
          </p>

          <div class="rounded-xl border border-gray-200 divide-y divide-gray-100">
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-2xs font-medium text-gray-500 uppercase">Nama</span>
              <span class="text-sm font-semibold text-gray-900">{{ akunResult.nama }}</span>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-2xs font-medium text-gray-500 uppercase">Email</span>
              <span class="text-sm font-semibold font-mono text-gray-900">{{ akunResult.email }}</span>
            </div>
            <div class="flex items-center justify-between px-4 py-3">
              <span class="text-2xs font-medium text-gray-500 uppercase">Password</span>
              <span class="text-sm font-semibold font-mono text-gray-900">{{ akunResult.password }}</span>
            </div>
          </div>

          <div class="flex gap-2 pt-1">
            <button
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              @click="copyAkun"
            >
              <Copy v-if="!copied" class="w-4 h-4" />
              <Check v-else class="w-4 h-4" />
              {{ copied ? 'Tersalin!' : 'Salin Akun' }}
            </button>
            <button class="btn-outline" @click="closeAkunModal">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal tambah akun -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="!createSaving && (showCreate = false)" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Plus class="w-5 h-5 text-red-600" />
            Tambah Akun
          </h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" :disabled="createSaving" @click="showCreate = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="px-6 py-5 space-y-3">
          <div class="grid sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-2xs font-medium text-gray-700 mb-1">Nama Lengkap <span class="text-rose-500">*</span></label>
              <input v-model="createForm.name" class="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500" placeholder="Contoh: Budi Santoso" />
            </div>
            <div>
              <label class="block text-2xs font-medium text-gray-700 mb-1">Email <span class="text-rose-500">*</span></label>
              <input v-model="createForm.email" type="email" class="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500" placeholder="nama@sekolah.sch.id" />
            </div>
            <div>
              <label class="block text-2xs font-medium text-gray-700 mb-1">Password <span class="text-rose-500">*</span></label>
              <input v-model="createForm.password" type="password" class="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500" placeholder="Minimal 8 karakter" />
            </div>
            <!-- Role selalu murid pada halaman ini -->
            <div>
              <label class="block text-2xs font-medium text-gray-700 mb-1">Jenis Kelamin</label>
              <select v-model="createForm.jenis_kelamin" class="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 bg-white">
                <option value="">— Pilih —</option>
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
              </select>
            </div>
            <div>
              <label class="block text-2xs font-medium text-gray-700 mb-1">Kelas</label>
              <input v-model="createForm.kelas" class="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500" placeholder="Contoh: XII RPL 1" />
            </div>
            <div>
              <label class="block text-2xs font-medium text-gray-700 mb-1">Jurusan</label>
              <select v-model="createForm.jurusan_id" class="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 bg-white">
                <option value="">— Pilih —</option>
                <option v-for="j in jurusanOptions" :key="j.value" :value="j.value">{{ j.label }}</option>
              </select>
            </div>
          </div>

          <p v-if="createError" class="text-sm text-rose-600">{{ createError }}</p>

          <div class="flex justify-end gap-3 pt-1">
            <button class="btn-outline" :disabled="createSaving" @click="showCreate = false">
              Batal
            </button>
            <button
              class="btn-primary"
              :disabled="createSaving"
              @click="submitCreate"
            >
              <Loader2 v-if="createSaving" class="w-4 h-4 animate-spin" />
              {{ createSaving ? 'Menyimpan…' : 'Simpan Akun' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
