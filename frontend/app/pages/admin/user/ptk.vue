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
  Star,
  GraduationCap
} from 'lucide-vue-next'
import { useAdminService, type UserItem, type AkunMurid } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'User PTK' })

const admin = useAdminService()

// ============================================================
// Data & filter
// ============================================================
const users = ref<UserItem[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// PTK = guru, kaproli, staff_sarpras, kepsek (double job dimungkinkan)
const PTK_ROLES = ['guru', 'kaproli', 'staff_sarpras', 'kepsek']

const roleFilter = ref<'guru' | 'kaproli' | 'staff_sarpras' | 'kepsek' | 'all'>('all')
const search = ref('')

const roleOptions = [
  { v: 'guru', l: 'Guru' },
  { v: 'kaproli', l: 'Ketua Proli' },
  { v: 'staff_sarpras', l: 'Staff Sarpras' },
  { v: 'kepsek', l: 'Kepala Sekolah' },
  { v: 'all', l: 'Semua Peran' }
] as const

const roleLabelMap: Record<string, string> = {
  guru: 'Guru',
  kaproli: 'Ketua Proli',
  staff_sarpras: 'Staf Sarpras',
  kepsek: 'Kepala Sekolah',
  admin: 'Admin'
}

const roleNames = (u: UserItem): string[] => (u.roles ?? []).map((r) => r.name)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return users.value.filter((u) => {
    const matchQ =
      !q ||
      u.name.toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    const matchR = roleFilter.value === 'all' || roleNames(u).includes(roleFilter.value)
    return matchQ && matchR
  })
})

// ---- Pagination: 20 akun per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedUsers = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(filtered, () => {
  page.value = 1
})

async function load() {
  loading.value = true
  error.value = null
  try {
    // Muat semua role PTK lalu gabung (API mendukung 1 role per panggilan)
    const all: UserItem[] = []
    for (const role of PTK_ROLES) {
      let p = 1
      for (;;) {
        const res = await admin.master.list<UserItem>('users', { role, per_page: 100, page: p })
        all.push(...res.data)
        if (p >= res.last_page) break
        p++
      }
    }
    const seen = new Set<number>()
    users.value = []
    for (const u of all) {
      if (seen.has(u.id)) continue
      seen.add(u.id)
      users.value.push(u)
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data PTK.'
  } finally {
    loading.value = false
  }
}

watch(roleFilter, () => {
  search.value = ''
  load()
})

onMounted(load)

// ============================================================
// Aksi akun (generate / lihat / reset / aktif)
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
        <h2 class="text-sm font-bold text-gray-900">User PTK</h2>
        <p class="text-2xs text-gray-500 mt-0.5">
          Kelola akun login Pendidik & Tenaga Kependidikan — guru, ketua proli, staf sarpras, kepala sekolah.
        </p>
      </div>
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-2xs text-gray-600">
        <GraduationCap class="w-3.5 h-3.5 text-blue-600" />
        User PTK
      </div>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>
    <p v-if="genError && !akunResult" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ genError }}</p>

    <!-- Bar filter -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div class="text-2xs font-medium text-gray-500 self-center pb-2.5">Akun PTK :</div>

        <div>
          <label class="text-2xs font-medium text-gray-400 mb-1 block">Peran</label>
          <select v-model="roleFilter" class="control">
            <option v-for="r in roleOptions" :key="r.v" :value="r.v">{{ r.l }}</option>
          </select>
        </div>

        <div class="flex-1" />

        <div class="relative">
          <input
            v-model="search"
            placeholder="Cari nama atau email"
            class="w-60 rounded-md border border-gray-200 pl-9 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-red-500"
          />
          <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        <div class="inline-flex items-center gap-1.5 rounded-md bg-gray-50 border border-gray-200 px-3 py-1.5 text-2xs font-medium text-gray-600">
          <Users class="w-3.5 h-3.5 text-gray-400" />
          Pengguna : {{ users.length }} Orang
        </div>
      </div>
    </div>

    <!-- Tabel -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px]">
          <thead>
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <th class="px-4 py-3 text-left font-semibold w-12">No.</th>
              <th class="px-4 py-3 text-left font-semibold w-24">ID PTK</th>
              <th class="px-4 py-3 text-center font-semibold w-20">Foto</th>
              <th class="px-4 py-3 text-left font-semibold">Nama Lengkap</th>
              <th class="px-4 py-3 text-left font-semibold">Peran</th>
              <th class="px-4 py-3 text-center font-semibold w-16">Jenis<br />Kelamin</th>
              <th class="px-4 py-3 text-left font-semibold w-52">Username</th>
              <th class="px-4 py-3 text-center font-semibold w-28">Password</th>
              <th class="px-4 py-3 text-center font-semibold w-20">Reset</th>
              <th class="px-4 py-3 text-center font-semibold border-l border-gray-200">Aksi Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="10" class="px-4 py-12 text-center text-gray-400 text-xs">Memuat data…</td>
            </tr>
            <tr v-else-if="!filtered.length">
              <td colspan="10" class="px-4 py-12 text-center text-gray-400 text-xs">Tidak ada data PTK.</td>
            </tr>
            <tr v-for="(u, idx) in pagedUsers" :key="u.id" class="border-t border-gray-200 hover:bg-gray-50/50 transition">
              <td class="px-4 py-3 text-gray-500">{{ (page - 1) * PER_PAGE + idx + 1 }}</td>
              <td class="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">PTK-{{ String(u.id).padStart(3, '0') }}</td>
              <td class="px-4 py-3 text-center">
                <img
                  v-if="u.foto"
                  :src="u.foto"
                  class="w-9 h-9 rounded-full object-cover mx-auto border border-gray-200"
                  alt="Foto"
                />
                <div v-else class="w-9 h-9 rounded-full bg-blue-100 border border-gray-200 flex items-center justify-center mx-auto">
                  <UserRound class="w-4 h-4 text-blue-600" />
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="font-semibold text-gray-900">{{ u.name }}</div>
                <div class="text-2xs text-gray-400">{{ u.email ?? 'Belum ada akun' }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="rn in roleNames(u)"
                    :key="rn"
                    class="inline-flex px-2 py-0.5 rounded text-2xs font-semibold"
                    :class="rn === 'guru' ? 'bg-blue-50 text-blue-700' : rn === 'kaproli' ? 'bg-amber-50 text-amber-700' : rn === 'staff_sarpras' ? 'bg-gray-50 text-gray-700' : 'bg-rose-50 text-rose-700'"
                  >
                    {{ roleLabelMap[rn] ?? rn }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-center text-gray-700">{{ u.jenis_kelamin === 'L' ? 'L' : u.jenis_kelamin === 'P' ? 'P' : '—' }}</td>
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
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination: 20 akun per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="PTK" />

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
  </div>
</template>
