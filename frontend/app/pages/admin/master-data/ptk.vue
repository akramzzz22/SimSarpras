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
  Camera,
  UserRound
} from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'
import Pagination from '~/components/pagination.vue'
import { formatTanggal } from '~/utils/format'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Data PTK' })

const admin = useAdminService()

interface PtkItem {
  id: number
  name: string
  email: string | null
  nip?: string | null
  nuptk?: string | null
  tempat_lahir?: string | null
  tanggal_lahir?: string | null
  alamat?: string | null
  no_hp?: string | null
  foto?: string | null
  jenis_kelamin?: 'L' | 'P' | null
  is_active?: boolean
  roles?: { id: number; name: string }[]
}

// PTK = Pendidik (guru) + Tenaga Kependidikan (staff_sarpras, kepsek)
// Kaproli ikut dimuat agar guru yang double job (guru + kaproli) tetap tampil.
const PTK_ROLES = ['guru', 'staff_sarpras', 'kepsek', 'kaproli']

const ptkList = ref<PtkItem[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const search = ref('')
const filterRole = ref('')

// Modal form
const showForm = ref(false)
const editingId = ref<number | null>(null)
const formError = ref<string | null>(null)
const form = ref({ name: '', email: '', password: '', roles: ['guru'] as string[], jenis_kelamin: '', foto: '', nip: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '', alamat: '', no_hp: '' })
const fotoInput = ref<HTMLInputElement | null>(null)
const fotoUploading = ref(false)

// Role yang bisa dipilih (double job): guru, kaproli, staff_sarpras, kepsek
const roleOptions = [
  { value: 'guru', label: 'Guru' },
  { value: 'kaproli', label: 'Ketua Proli' },
  { value: 'staff_sarpras', label: 'Staf Sarpras' },
  { value: 'kepsek', label: 'Kepala Sekolah' }
]

const roleLabelMap: Record<string, string> = {
  guru: 'Guru',
  kaproli: 'Ketua Proli',
  staff_sarpras: 'Staf Sarpras',
  kepsek: 'Kepala Sekolah',
  admin: 'Admin',
  murid: 'Murid'
}

const roleBadgeStyle: Record<string, { bg: string; fg: string; border: string }> = {
  guru: { bg: '#EFF6FF', fg: '#1D4ED8', border: '#BFDBFE' },
  kaproli: { bg: '#FFFBEB', fg: '#B45309', border: '#FDE68A' },
  staff_sarpras: { bg: '#F3F4F6', fg: '#4B5563', border: '#D1D5DB' },
  kepsek: { bg: '#FEF2F2', fg: '#DC2626', border: '#FECACA' }
}

const roleNames = (p: PtkItem): string[] => (p.roles ?? []).map((r) => r.name)

// Gaya badge per role — setiap chip memakai warna rolenya sendiri
const roleBadgeFor = (name: string): { bg: string; fg: string; border: string } =>
  roleBadgeStyle[name] ?? { bg: '#F3F4F6', fg: '#6B7280', border: '#E5E7EB' }

function toggleRole(v: string) {
  const cur = form.value.roles
  form.value.roles = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
}

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return ptkList.value.filter((p) => {
    const matchQ = !q || p.name.toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q)
    const matchR = !filterRole.value || roleNames(p).includes(filterRole.value)
    return matchQ && matchR
  })
})

// ---- Pagination: 20 per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedFiltered = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(filtered, () => {
  page.value = 1
})

async function load() {
  loading.value = true
  error.value = null
  try {
    // Muat semua role PTK lalu gabung (API hanya mendukung 1 role per panggilan)
    const all: PtkItem[] = []
    for (const role of PTK_ROLES) {
      let p = 1
      for (;;) {
        const res = await admin.master.list<PtkItem>('users', { role, per_page: 100, page: p })
        all.push(...res.data)
        if (p >= res.last_page) break
        p++
      }
    }
    // Hilangkan duplikat (satu user bisa saja muncul 2x bila role berubah)
    const seen = new Set<number>()
    const unique: PtkItem[] = []
    for (const u of all) {
      if (!seen.has(u.id)) {
        seen.add(u.id)
        unique.push(u)
      }
    }
    ptkList.value = unique
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data PTK.'
  } finally {
    loading.value = false
  }
}

function pickFoto() {
  fotoInput.value?.click()
}

async function onFotoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    formError.value = 'File harus berupa gambar.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    formError.value = 'Ukuran foto maksimal 5MB.'
    return
  }
  fotoUploading.value = true
  formError.value = null
  try {
    const res = await admin.upload(file)
    form.value.foto = res.url
  } catch (err: any) {
    formError.value = err?.data?.message ?? 'Gagal mengunggah foto.'
  } finally {
    fotoUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

function resetForm() {
  form.value = { name: '', email: '', password: '', roles: ['guru'], jenis_kelamin: '', foto: '', nip: '', nuptk: '', tempat_lahir: '', tanggal_lahir: '', alamat: '', no_hp: '' }
}

function openCreate() {
  editingId.value = null
  resetForm()
  formError.value = null
  showForm.value = true
}

function openEdit(p: PtkItem) {
  editingId.value = p.id
  form.value = {
    name: p.name,
    email: p.email ?? '',
    password: '',
    roles: roleNames(p).filter((n) => roleOptions.some((o) => o.value === n)),
    jenis_kelamin: p.jenis_kelamin ?? '',
    foto: p.foto ?? '',
    nip: p.nip ?? '',
    nuptk: p.nuptk ?? '',
    tempat_lahir: p.tempat_lahir ?? '',
    tanggal_lahir: p.tanggal_lahir ? String(p.tanggal_lahir).slice(0, 10) : '',
    alamat: p.alamat ?? '',
    no_hp: p.no_hp ?? ''
  }
  if (!form.value.roles.length) form.value.roles = ['guru']
  formError.value = null
  showForm.value = true
}

async function submit() {
  if (!form.value.name.trim()) {
    formError.value = 'Nama lengkap wajib diisi.'
    return
  }
  if (editingId.value === null && !form.value.email.trim()) {
    formError.value = 'Email wajib diisi.'
    return
  }
  if (editingId.value === null && !form.value.password) {
    formError.value = 'Password awal wajib diisi (minimal 8 karakter).'
    return
  }
  if (!form.value.roles.length) {
    formError.value = 'Pilih minimal satu peran.'
    return
  }
  saving.value = true
  formError.value = null
  try {
    const body: Record<string, any> = {
      name: form.value.name,
      roles: form.value.roles,
      jenis_kelamin: form.value.jenis_kelamin || null,
      foto: form.value.foto || null,
      nip: form.value.nip.trim() || null,
      nuptk: form.value.nuptk.trim() || null,
      tempat_lahir: form.value.tempat_lahir.trim() || null,
      tanggal_lahir: form.value.tanggal_lahir || null,
      alamat: form.value.alamat.trim() || null,
      no_hp: form.value.no_hp.trim() || null
    }
    if (editingId.value !== null) {
      if (form.value.email.trim()) body.email = form.value.email
      if (form.value.password) body.password = form.value.password
      await admin.master.update('users', editingId.value, body)
    } else {
      body.email = form.value.email
      body.password = form.value.password
      await admin.master.create('users', body)
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    const err = e?.data?.errors
    const firstKey = err ? Object.keys(err)[0] : null
    formError.value =
      (firstKey && err[firstKey]?.[0]) || e?.data?.message || 'Gagal menyimpan data.'
  } finally {
    saving.value = false
  }
}

async function remove(p: PtkItem) {
  if (!confirm(`Yakin ingin menghapus ${p.name}?`)) return
  try {
    await admin.master.remove('users', p.id)
    await load()
  } catch {
    alert('Gagal menghapus data. Pastikan data tidak sedang dipakai.')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Data PTK</h2>
        <p class="text-sm text-gray-500 mt-0.5">
          Kelola Pendidik & Tenaga Kependidikan (guru, staf sarpras, kepala sekolah).
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition shadow-sm"
        style="background-color: #1D4ED8; color: #ffffff; border: 1px solid #1D4ED8;"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" />
        Tambah PTK
      </button>
    </div>

    <!-- Filter -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Cari nama atau email…"
          class="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style="border-color: #D1D5DB;"
        />
      </div>
      <select
        v-model="filterRole"
        class="rounded-lg border px-3 py-2.5 text-sm outline-none bg-white"
        style="border-color: #D1D5DB;"
        title="Filter peran"
      >
        <option value="">Semua Peran</option>
        <option v-for="r in roleOptions" :key="r.value" :value="r.value">{{ r.label }}</option>
      </select>
      <button
        class="p-2.5 rounded-lg border text-gray-500 hover:bg-gray-50 transition w-fit"
        style="border-color: #D1D5DB;"
        title="Muat ulang"
        @click="load"
      >
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm font-medium" style="border: 1px solid #FECACA; background-color: #FEF2F2; color: #DC2626; border-radius: 8px; padding: 10px 14px;">
      {{ error }}
    </p>

    <!-- Tabel boxed -->
    <div class="overflow-hidden" style="border: 1px solid #D1D5DB; border-radius: 8px; background-color: #ffffff;">
      <div class="overflow-x-auto">
        <table class="w-full" style="border-collapse: collapse;">
          <thead>
            <tr style="background-color: #F8F9FA;">
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">No.</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">Nama</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">NIP</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">NUPTK</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">Tempat, Tgl Lahir</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">No. HP</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">Email</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">Peran</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">JK</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: left;">Status</th>
              <th style="padding: 10px 14px; font-size: 14px; color: #374151; border-bottom: 1px solid #E5E7EB; text-align: right;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in pagedFiltered" :key="p.id" style="border-bottom: 1px solid #E5E7EB;">
              <td style="padding: 10px 14px; color: #9CA3AF;">{{ (page - 1) * PER_PAGE + i + 1 }}</td>
              <td style="padding: 10px 14px;">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white overflow-hidden shrink-0" style="background-color: #1D4ED8;">
                    <img v-if="p.foto" :src="p.foto" class="w-full h-full object-cover" alt="Foto" />
                    <span v-else>{{ p.name.charAt(0).toUpperCase() }}</span>
                  </div>
                  <span class="font-medium" style="color: #0F172A;">{{ p.name }}</span>
                </div>
              </td>
              <td style="padding: 10px 14px;">
                <span class="text-xs font-mono" style="color: #4B5563;">{{ p.nip ?? '—' }}</span>
              </td>
              <td style="padding: 10px 14px;">
                <span class="text-xs font-mono" style="color: #4B5563;">{{ p.nuptk ?? '—' }}</span>
              </td>
              <td style="padding: 10px 14px; color: #4B5563; white-space: nowrap;">
                <template v-if="p.tempat_lahir || p.tanggal_lahir">
                  {{ [p.tempat_lahir, p.tanggal_lahir ? formatTanggal(p.tanggal_lahir) : null].filter(Boolean).join(', ') }}
                </template>
                <span v-else style="color: #9CA3AF;">—</span>
              </td>
              <td style="padding: 10px 14px; color: #4B5563; white-space: nowrap;">{{ p.no_hp ?? '—' }}</td>
              <td style="padding: 10px 14px;">
                <span class="text-xs" style="color: #6B7280;">{{ p.email ?? '—' }}</span>
              </td>
              <td style="padding: 10px 14px;">
                <div class="flex flex-wrap items-center gap-1">
                  <span
                    v-for="rn in roleNames(p)"
                    :key="rn"
                    class="text-xs px-2 py-0.5 rounded font-semibold whitespace-nowrap"
                    :style="{ backgroundColor: roleBadgeFor(rn).bg, color: roleBadgeFor(rn).fg, border: `1px solid ${roleBadgeFor(rn).border}` }"
                  >
                    {{ roleLabelMap[rn] ?? rn }}
                  </span>
                  <span v-if="!roleNames(p).length" class="text-xs" style="color: #9CA3AF;">—</span>
                </div>
              </td>
              <td style="padding: 10px 14px; color: #6B7280;">{{ p.jenis_kelamin ?? '—' }}</td>
              <td style="padding: 10px 14px;">
                <span class="text-xs px-2 py-1 rounded font-semibold" :style="p.is_active === false ? { backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' } : { backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }">
                  {{ p.is_active === false ? 'Nonaktif' : 'Aktif' }}
                </span>
              </td>
              <td class="text-right whitespace-nowrap" style="padding: 10px 14px;">
                <button class="p-1.5 rounded-lg transition ml-1" style="color: #9CA3AF;" title="Edit" @click="openEdit(p)">
                  <Pencil class="w-4 h-4" />
                </button>
                <button class="p-1.5 rounded-lg transition ml-1" style="color: #9CA3AF;" title="Hapus" @click="remove(p)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td :colspan="11" style="padding: 40px 14px; text-align: center; color: #9CA3AF;">
                <Inbox class="w-8 h-8 mx-auto mb-2" style="color: #D1D5DB;" />
                {{ ptkList.length ? 'Tidak ada data yang cocok.' : 'Belum ada data PTK. Klik "Tambah PTK" untuk memulai.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" style="padding: 20px 14px; text-align: center; font-size: 14px; color: #9CA3AF;">Memuat data…</div>
    </div>

    <!-- Pagination -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="PTK" />

    <!-- ============ Modal form ============ -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
      <div class="relative bg-white shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" style="border-radius: 10px;">
        <div class="flex items-center justify-between px-6 py-4" style="border-bottom: 1px solid #E5E7EB;">
          <h3 class="font-semibold" style="color: #0F172A;">{{ editingId !== null ? 'Edit' : 'Tambah' }} PTK</h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" @click="showForm = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form class="px-6 py-5 overflow-y-auto grid sm:grid-cols-2 gap-4" @submit.prevent="submit">
          <!-- Foto -->
          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Foto Profil</label>
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white overflow-hidden shrink-0" style="background-color: #1D4ED8;">
                <img v-if="form.foto" :src="form.foto" class="w-full h-full object-cover" alt="Foto" />
                <UserRound v-else class="w-6 h-6" />
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition"
                style="border-color: #D1D5DB; color: #4B5563;"
                @click="pickFoto"
              >
                <Camera v-if="!fotoUploading" class="w-3.5 h-3.5" />
                <Loader2 v-else class="w-3.5 h-3.5 animate-spin" />
                {{ fotoUploading ? 'Mengunggah…' : 'Unggah Foto' }}
              </button>
              <button
                v-if="form.foto"
                type="button"
                class="text-xs font-medium"
                style="color: #DC2626;"
                @click="form.foto = ''"
              >
                Hapus
              </button>
            </div>
            <input ref="fotoInput" type="file" accept="image/*" class="hidden" :disabled="fotoUploading" @change="onFotoChange" />
          </div>

          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">
              Nama Lengkap <span style="color: #DC2626;">*</span>
            </label>
            <input
              v-model="form.name"
              required
              placeholder="Contoh: Budi Santoso, S.Pd"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">NIP</label>
            <input
              v-model="form.nip"
              placeholder="Contoh: 197001011990031001"
              maxlength="30"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">NUPTK</label>
            <input
              v-model="form.nuptk"
              placeholder="Contoh: 1234567890123456"
              maxlength="30"
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

          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">No. HP</label>
            <input
              v-model="form.no_hp"
              placeholder="Contoh: 081234567890"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Email <span style="color: #DC2626;">*</span></label>
            <input
              v-model="form.email"
              type="email"
              :disabled="editingId !== null"
              :placeholder="editingId !== null ? form.email || '(belum ada)' : 'nama@sekolah.sch.id'"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none disabled:bg-gray-100"
              style="border-color: #D1D5DB;"
            />
            <p v-if="editingId !== null" class="mt-1 text-2xs" style="color: #9CA3AF;">Email tidak bisa diubah.</p>
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">
              {{ editingId !== null ? 'Password Baru' : 'Password Awal' }}
              <span v-if="editingId === null" style="color: #DC2626;">*</span>
            </label>
            <input
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              :placeholder="editingId !== null ? 'Kosongkan jika tidak diganti' : 'Minimal 8 karakter'"
              class="w-full rounded-md border px-3 py-2.5 text-sm outline-none"
              style="border-color: #D1D5DB;"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">Jenis Kelamin</label>
            <select v-model="form.jenis_kelamin" class="w-full rounded-md border px-3 py-2.5 text-sm outline-none bg-white" style="border-color: #D1D5DB;">
              <option value="">— Pilih —</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div class="sm:col-span-2">
            <label class="block text-xs font-semibold mb-1" style="color: #374151;">
              Peran (boleh lebih dari satu — double job) <span style="color: #DC2626;">*</span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label
                v-for="r in roleOptions"
                :key="r.value"
                class="flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition select-none"
                :style="form.roles.includes(r.value)
                  ? { borderColor: '#1D4ED8', backgroundColor: '#EFF6FF', color: '#1D4ED8' }
                  : { borderColor: '#D1D5DB', backgroundColor: '#ffffff', color: '#4B5563' }"
              >
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded"
                  style="accent-color: #1D4ED8;"
                  :checked="form.roles.includes(r.value)"
                  @change="toggleRole(r.value)"
                />
                <span class="text-xs font-medium">{{ r.label }}</span>
              </label>
            </div>
            <p class="mt-1 text-2xs" style="color: #9CA3AF;">
              Contoh: Guru + Ketua Proli, atau Guru + Staf Sarpras (double job).
            </p>
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
