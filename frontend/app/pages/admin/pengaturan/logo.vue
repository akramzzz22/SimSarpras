<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loader2, RefreshCw, Camera, X, ShieldCheck, Check } from 'lucide-vue-next'
import { useAdminService, type PageSetting } from '~/services/api/admin'
import { LOGO_KEYS, useSekolah } from '~/composables/useSekolah'
import { sekolah } from '~/config/sekolah'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Logo & Identitas' })

const admin = useAdminService()
const { refresh: refreshSekolah } = useSekolah()

// Definisikan slot logo yang bisa diatur
const LOGO_SLOTS = [
  {
    key: LOGO_KEYS.aplikasi,
    label: 'Logo Aplikasi',
    desc: 'Logo kecil di kiri top bar & bar identitas mobile.',
    default: sekolah.fotoAplikasi,
    field: 'fotoAplikasi'
  },
  {
    key: LOGO_KEYS.sekolah,
    label: 'Logo Sekolah',
    desc: 'Logo SMK di kanan header & halaman login.',
    default: sekolah.fotoSekolah,
    field: 'fotoSekolah'
  },
  {
    key: LOGO_KEYS.disdik,
    label: 'Logo Dinas Pendidikan (Cadisdik VII)',
    desc: 'Logo Cabang Dinas Pendidikan Wilayah VII di kanan header & kop surat.',
    default: sekolah.fotoDinas,
    field: 'fotoDinas'
  },
  {
    key: LOGO_KEYS.pemprov,
    label: 'Logo Provinsi (opsional)',
    desc: 'Logo Pemprov Jabar di kanan header (boleh kosong).',
    default: sekolah.fotoPemprov,
    field: 'fotoPemprov'
  },
  {
    key: LOGO_KEYS.pattern,
    label: 'Pattern Header (opsional)',
    desc: 'Gambar dekoratif yang diulang di header admin & staff. Kosong = garis diagonal bawaan.',
    default: sekolah.patternHeader,
    field: 'patternHeader'
  }
]

// State: nilai per slot (URL gambar)
const values = ref<Record<string, string>>({})
const settings = ref<PageSetting[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)

const uploadingKey = ref<string | null>(null)
const fileInputs = ref<Record<string, HTMLInputElement | null>>({})

onMounted(load)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.pageSettings.list()
    settings.value = res
    // Inisialisasi dari setting yang tersimpan (fallback ke config bawaan)
    values.value = {}
    for (const slot of LOGO_SLOTS) {
      const found = res.find((p) => p.page_key === slot.key)
      values.value[slot.key] = found?.gambar ?? slot.default ?? ''
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat pengaturan logo.'
  } finally {
    loading.value = false
  }
}

function pick(key: string) {
  fileInputs.value[key]?.click()
}

async function onFileChange(key: string, e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'File harus berupa gambar.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Ukuran gambar maksimal 5MB.'
    return
  }
  uploadingKey.value = key
  error.value = null
  try {
    const res = await admin.upload(file)
    values.value[key] = res.url
  } catch (err: any) {
    error.value = err?.data?.message ?? 'Gagal mengunggah gambar.'
  } finally {
    uploadingKey.value = null
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function save() {
  saving.value = true
  error.value = null
  saved.value = false
  try {
    for (const slot of LOGO_SLOTS) {
      const url = values.value[slot.key] || null
      const existing = settings.value.find((p) => p.page_key === slot.key)
      if (existing) {
        await admin.pageSettings.update(existing.id, { page_name: slot.label, gambar: url })
      } else if (url) {
        await admin.pageSettings.create({ page_key: slot.key, page_name: slot.label, gambar: url })
      }
    }
    saved.value = true
    setTimeout(() => (saved.value = false), 3000)
    // Muat ulang agar komposabel header ikut update (state di-share)
    const res = await admin.pageSettings.list()
    settings.value = res
    await refreshSekolah()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal menyimpan pengaturan.'
  } finally {
    saving.value = false
  }
}

function hapusSlot(key: string) {
  values.value[key] = ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Logo & Identitas</h2>
        <p class="text-2xs text-gray-500 mt-0.5">
          Unggah logo yang tampil di header aplikasi (top bar, identitas instansi, login, kop surat).
        </p>
      </div>
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-2xs text-gray-600">
        <ShieldCheck class="w-3.5 h-3.5 text-blue-600" />
        Pengaturan
      </div>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div v-if="saved" class="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
      <Check class="w-4 h-4" />
      Pengaturan logo berhasil disimpan.
    </div>

    <!-- Daftar slot logo -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-sm text-gray-400">
      Memuat…
    </div>

    <div v-else class="grid sm:grid-cols-2 gap-4">
      <div
        v-for="slot in LOGO_SLOTS"
        :key="slot.key"
        class="bg-white p-5"
        style="border: 1px solid #D1D5DB; border-radius: 8px;"
      >
        <div class="flex items-start gap-4">
          <!-- Pratinjau -->
          <div
            class="w-16 h-16 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
            style="border: 1px solid #E5E7EB; background-color: #F8F9FA;"
          >
            <img
              v-if="values[slot.key]"
              :src="values[slot.key]"
              class="w-full h-full object-contain p-1"
              alt="Pratinjau"
            />
            <ShieldCheck v-else class="w-6 h-6" style="color: #D1D5DB;" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold" style="color: #0F172A;">{{ slot.label }}</div>
            <p class="text-xs mt-0.5" style="color: #6B7280;">{{ slot.desc }}</p>

            <div class="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition"
                style="background-color: #1D4ED8; color: #ffffff; border: 1px solid #1D4ED8;"
                :disabled="uploadingKey === slot.key"
                @click="pick(slot.key)"
              >
                <Loader2 v-if="uploadingKey === slot.key" class="w-3.5 h-3.5 animate-spin" />
                <Camera v-else class="w-3.5 h-3.5" />
                {{ uploadingKey === slot.key ? 'Mengunggah…' : 'Unggah' }}
              </button>
              <button
                v-if="values[slot.key]"
                type="button"
                class="text-xs font-medium"
                style="color: #DC2626;"
                @click="hapusSlot(slot.key)"
              >
                Hapus
              </button>
            </div>
            <input
              :ref="(el) => (fileInputs[slot.key] = el as HTMLInputElement)"
              type="file"
              accept="image/*"
              class="hidden"
              :disabled="uploadingKey === slot.key"
              @change="onFileChange(slot.key, $event)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Aksi simpan -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-xs" style="color: #6B7280;">
        <RefreshCw class="w-3.5 h-3.5" style="color: #9CA3AF;" />
        Perubahan langsung tampil di header setelah disimpan.
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-60"
        style="background-color: #1D4ED8; color: #ffffff; border: 1px solid #1D4ED8;"
        :disabled="saving"
        @click="save"
      >
        <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
        {{ saving ? 'Menyimpan…' : 'Simpan Logo' }}
      </button>
    </div>
  </div>
</template>
