<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  CalendarDays, Plus, Loader2, Pencil, Trash2, X, Check, Save, Info, CheckCircle2
} from 'lucide-vue-next'
import { useAdminService, type TahunAjaran } from '~/services/api/admin'
import { useTahunAjaran } from '~/composables/useTahunAjaran'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Tahun Ajaran' })

const admin = useAdminService()
const { refresh: refreshTahunAjaran } = useTahunAjaran()

const list = ref<TahunAjaran[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

// ---- Set aktif (pilih TA + semester) ----
const aktifId = ref<number | null>(null)
const semesterAktif = ref<'ganjil' | 'genap'>('ganjil')
const setError = ref<string | null>(null)

// ---- Modal tambah/edit ----
const showForm = ref(false)
const editId = ref<number | null>(null)
const form = ref({ nama: '', tanggal_mulai: '', tanggal_selesai: '' })
const formError = ref<string | null>(null)

const SEMESTER_OPTIONS = [
  { v: 'ganjil', l: 'Semester Ganjil' },
  { v: 'genap', l: 'Semester Genap' }
] as const

onMounted(load)

async function load() {
  loading.value = true
  error.value = null
  try {
    list.value = await admin.tahunAjaran.list()
    const aktif = list.value.find((t) => t.is_active)
    aktifId.value = aktif?.id ?? null
    semesterAktif.value = aktif?.semester ?? 'ganjil'
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat tahun ajaran.'
  } finally {
    loading.value = false
  }
}

function flashNotice(msg: string) {
  notice.value = msg
  setTimeout(() => (notice.value = null), 3500)
}

async function setAktif(id: number) {
  setError.value = null
  saving.value = true
  try {
    await admin.tahunAjaran.setAktif({ tahun_ajaran_id: id, semester: semesterAktif.value })
    await load()
    await refreshTahunAjaran()
    flashNotice(`Tahun ajaran ${list.value.find((t) => t.id === id)?.nama} diaktifkan (${semesterAktif.value === 'ganjil' ? 'Ganjil' : 'Genap'}).`)
  } catch (e: any) {
    setError.value = e?.data?.message ?? 'Gagal mengubah tahun ajaran aktif.'
  } finally {
    saving.value = false
  }
}

async function onSemesterChange() {
  if (aktifId.value === null) return
  setError.value = null
  saving.value = true
  try {
    await admin.tahunAjaran.setAktif({ tahun_ajaran_id: aktifId.value, semester: semesterAktif.value })
    await load()
    await refreshTahunAjaran()
    flashNotice(`Semester aktif diubah menjadi ${semesterAktif.value === 'ganjil' ? 'Ganjil' : 'Genap'}.`)
  } catch (e: any) {
    setError.value = e?.data?.message ?? 'Gagal mengubah semester.'
  } finally {
    saving.value = false
  }
}

function openTambah() {
  editId.value = null
  form.value = { nama: '', tanggal_mulai: '', tanggal_selesai: '' }
  formError.value = null
  showForm.value = true
}

function openEdit(t: TahunAjaran) {
  editId.value = t.id
  form.value = {
    nama: t.nama,
    tanggal_mulai: t.tanggal_mulai?.slice(0, 10) ?? '',
    tanggal_selesai: t.tanggal_selesai?.slice(0, 10) ?? ''
  }
  formError.value = null
  showForm.value = true
}

async function submitForm() {
  formError.value = null
  if (!form.value.nama.trim()) {
    formError.value = 'Nama tahun ajaran wajib diisi.'
    return
  }
  saving.value = true
  try {
    const body = {
      nama: form.value.nama.trim(),
      tanggal_mulai: form.value.tanggal_mulai || null,
      tanggal_selesai: form.value.tanggal_selesai || null
    }
    if (editId.value === null) {
      await admin.tahunAjaran.create(body)
      flashNotice(`Tahun ajaran ${body.nama} ditambahkan.`)
    } else {
      await admin.tahunAjaran.update(editId.value, body)
      flashNotice(`Tahun ajaran ${body.nama} diperbarui.`)
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    formError.value = e?.data?.message ?? 'Gagal menyimpan tahun ajaran.'
  } finally {
    saving.value = false
  }
}

async function hapus(t: TahunAjaran) {
  if (!confirm(`Hapus tahun ajaran "${t.nama}"? Data di dalamnya tidak ikut terhapus, hanya tidak tampil lagi.`)) return
  saving.value = true
  setError.value = null
  try {
    await admin.tahunAjaran.remove(t.id)
    flashNotice(`Tahun ajaran ${t.nama} dihapus.`)
    await load()
  } catch (e: any) {
    setError.value = e?.data?.message ?? 'Gagal menghapus tahun ajaran.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Tahun Ajaran</h2>
        <p class="text-2xs text-gray-500 mt-0.5">
          Pilih tahun ajaran & semester aktif — data yang tampil di seluruh aplikasi mengikuti pengaturan ini.
        </p>
      </div>
      <button class="btn-primary" @click="openTambah">
        <Plus class="w-4 h-4" />
        Tambah Tahun Ajaran
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>
    <p v-if="setError" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ setError }}</p>
    <p v-if="notice" class="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      <CheckCircle2 class="w-4 h-4 shrink-0" />
      {{ notice }}
    </p>

    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-sm text-gray-400">
      Memuat…
    </div>

    <div v-else-if="!list.length" class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-sm text-gray-400">
      Belum ada tahun ajaran. Klik "Tambah Tahun Ajaran" untuk memulai.
    </div>

    <!-- Daftar tahun ajaran -->
    <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px]">
          <thead>
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <th class="px-4 py-3 text-left font-semibold">Tahun Ajaran</th>
              <th class="px-4 py-3 text-left font-semibold">Periode</th>
              <th class="px-4 py-3 text-center font-semibold w-52">Semester Aktif</th>
              <th class="px-4 py-3 text-center font-semibold w-24">Status</th>
              <th class="px-4 py-3 text-center font-semibold w-40">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in list"
              :key="t.id"
              class="border-t border-gray-200 hover:bg-gray-50/50 transition"
              :class="t.is_active ? 'bg-blue-50/40' : ''"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <CalendarDays class="w-4 h-4 text-blue-600 shrink-0" />
                  <span class="font-semibold text-gray-900">{{ t.nama }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                {{ t.tanggal_mulai ? t.tanggal_mulai.slice(0, 10) : '—' }}
                s/d
                {{ t.tanggal_selesai ? t.tanggal_selesai.slice(0, 10) : '—' }}
              </td>
              <td class="px-4 py-3 text-center">
                <select
                  v-if="t.is_active"
                  v-model="semesterAktif"
                  name="semester"
                  class="control mx-auto"
                  :disabled="saving"
                  @change="onSemesterChange"
                >
                  <option v-for="s in SEMESTER_OPTIONS" :key="s.v" :value="s.v">{{ s.l }}</option>
                </select>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  v-if="t.is_active"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  <Check class="w-3 h-3" />
                  Aktif
                </span>
                <span v-else class="inline-flex px-2.5 py-1 rounded text-2xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                  Nonaktif
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    v-if="!t.is_active"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-2xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
                    :disabled="saving"
                    @click="setAktif(t.id)"
                  >
                    <Check class="w-3 h-3" />
                    Aktifkan
                  </button>
                  <button
                    class="p-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                    title="Edit"
                    @click="openEdit(t)"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button
                    class="p-1.5 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition disabled:opacity-60"
                    title="Hapus"
                    :disabled="saving || t.is_active"
                    @click="hapus(t)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Info -->
    <div class="flex items-start gap-2 px-4 py-3 text-xs rounded-xl border border-blue-200 bg-blue-50 text-blue-800">
      <Info class="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <b>Bagaimana cara kerjanya?</b> Data yang tampil (barang, murid, peminjaman, laporan kerusakan, maintenance, dan
        statistik) hanya milik tahun ajaran yang <b>aktif</b>. Data baru otomatis masuk ke tahun ajaran aktif saat ini.
      </div>
    </div>

    <!-- Modal tambah/edit -->
    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="!saving && (showForm = false)" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays class="w-5 h-5 text-blue-600" />
            {{ editId === null ? 'Tambah Tahun Ajaran' : 'Edit Tahun Ajaran' }}
          </h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" :disabled="saving" @click="showForm = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="px-6 py-5 space-y-3">
          <div>
            <label class="block text-2xs font-medium text-gray-700 mb-1">Nama Tahun Ajaran <span class="text-rose-500">*</span></label>
            <input
              v-model="form.nama"
              class="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: 2026/2027"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-2xs font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <input v-model="form.tanggal_mulai" type="date" class="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-2xs font-medium text-gray-700 mb-1">Tanggal Selesai</label>
              <input v-model="form.tanggal_selesai" type="date" class="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <p v-if="formError" class="text-sm text-rose-600">{{ formError }}</p>

          <div class="flex justify-end gap-3 pt-1">
            <button class="btn-outline" :disabled="saving" @click="showForm = false">Batal</button>
            <button class="btn-primary" :disabled="saving" @click="submitForm">
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              <Save v-else class="w-4 h-4" />
              {{ saving ? 'Menyimpan…' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
