<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loader2, Save, Check, ImageIcon, UserCog, CalendarDays, ChevronRight, Settings, ShieldCheck } from 'lucide-vue-next'
import { useAdminService, type SistemSetting } from '~/services/api/admin'
import { useSekolah } from '~/composables/useSekolah'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Pengaturan Sistem' })

const admin = useAdminService()
const { refresh: refreshSekolah } = useSekolah()

const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)

// Nilai form (snake_case sesuai API)
const form = ref<SistemSetting>({
  nama_aplikasi: '',
  pengumuman: '',
  max_hari_pinjam: 7,
  max_barang_pinjam: 5,
  jam_mulai: '07:30',
  jam_selesai: '15:30',
  mode_pemeliharaan: false
})

// Kategori lain yang dulu ada di halaman hub — tetap mudah dijangkau
const kategoriLain = [
  {
    title: 'Logo & Identitas',
    desc: 'Unggah logo aplikasi, sekolah, dinas, dan provinsi.',
    to: '/admin/pengaturan/logo',
    icon: ImageIcon,
    cls: 'bg-blue-50 text-blue-600'
  },
  {
    title: 'Role & Hak Akses',
    desc: 'Kelola peran pengguna dan izin aksesnya.',
    to: '/admin/pengaturan/role',
    icon: UserCog,
    cls: 'bg-red-50 text-red-600'
  },
  {
    title: 'Tahun Ajaran',
    desc: 'Pilih tahun ajaran & semester aktif.',
    to: '/admin/pengaturan/tahun-ajaran',
    icon: CalendarDays,
    cls: 'bg-emerald-50 text-emerald-600'
  }
]

onMounted(load)

async function load() {
  loading.value = true
  error.value = null
  try {
    const s = await admin.sistem.show()
    form.value = { ...form.value, ...s }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat pengaturan sistem.'
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  error.value = null
  saved.value = false
  try {
    const s = await admin.sistem.update({ ...form.value })
    form.value = { ...form.value, ...s }
    saved.value = true
    setTimeout(() => (saved.value = false), 3000)
    // Muat ulang state global → nama aplikasi & pengumuman di header/login ikut berubah
    await refreshSekolah()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal menyimpan pengaturan.'
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
        <h2 class="text-sm font-bold text-gray-900">Pengaturan Sistem</h2>
        <p class="text-2xs text-gray-500 mt-0.5">
          Atur identitas aplikasi, batasan peminjaman, dan mode pemeliharaan.
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
      Pengaturan sistem berhasil disimpan.
    </div>

    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-sm text-gray-400">
      Memuat…
    </div>

    <template v-else>
      <!-- ============ Umum ============ -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
            <Settings class="w-4 h-4" />
          </div>
          <div>
            <div class="text-sm font-semibold text-gray-900">Umum</div>
            <div class="text-2xs text-gray-400">Identitas aplikasi yang tampil di header & halaman login.</div>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Nama Aplikasi</label>
            <input
              v-model="form.nama_aplikasi"
              type="text"
              class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Aplikasi Sarpras"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Teks Pengumuman</label>
            <textarea
              v-model="form.pengumuman"
              rows="3"
              class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Pengumuman di bar atas…"
            />
            <p class="text-2xs text-gray-400 mt-1">Kosongkan untuk menyembunyikan teks promosi di bar atas.</p>
          </div>
        </div>
      </div>

      <!-- ============ Peminjaman ============ -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600">
            <CalendarDays class="w-4 h-4" />
          </div>
          <div>
            <div class="text-sm font-semibold text-gray-900">Batasan & Jam Peminjaman</div>
            <div class="text-2xs text-gray-400">Ketentuan umum peminjaman barang di sekolah.</div>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Maks. Lama Pinjam (hari)</label>
            <input
              v-model.number="form.max_hari_pinjam"
              type="number"
              min="1"
              max="365"
              class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Maks. Barang per Pengajuan</label>
            <input
              v-model.number="form.max_barang_pinjam"
              type="number"
              min="1"
              max="100"
              class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Jam Operasional — Mulai</label>
            <input
              v-model="form.jam_mulai"
              type="time"
              class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Jam Operasional — Selesai</label>
            <input
              v-model="form.jam_selesai"
              type="time"
              class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- ============ Sistem ============ -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
              <ShieldCheck class="w-4 h-4" />
            </div>
            <div>
              <div class="text-sm font-semibold text-gray-900">Mode Pemeliharaan</div>
              <p class="text-2xs text-gray-400 mt-0.5 max-w-md">
                Bila aktif, aplikasi menampilkan banner peringatan (di halaman login & top bar admin)
                bahwa sistem sedang dalam pemeliharaan.
              </p>
            </div>
          </div>

          <!-- Toggle -->
          <button
            type="button"
            role="switch"
            :aria-checked="form.mode_pemeliharaan"
            class="relative w-11 h-6 rounded-full transition-colors shrink-0"
            :class="form.mode_pemeliharaan ? 'bg-amber-500' : 'bg-gray-200'"
            @click="form.mode_pemeliharaan = !form.mode_pemeliharaan"
          >
            <span
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
              :class="form.mode_pemeliharaan ? 'left-[22px]' : 'left-0.5'"
            />
          </button>
        </div>
      </div>

      <!-- Aksi simpan -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 text-2xs text-gray-400">
          <Check class="w-3.5 h-3.5 text-emerald-500" />
          Perubahan nama aplikasi & pengumuman langsung tampil di header setelah disimpan.
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-60"
          style="background-color: #1D4ED8; color: #ffffff; border: 1px solid #1D4ED8;"
          :disabled="saving"
          @click="save"
        >
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
          <Save v-else class="w-4 h-4" />
          {{ saving ? 'Menyimpan…' : 'Simpan Pengaturan' }}
        </button>
      </div>

      <!-- Kategori lain -->
      <div>
        <div class="text-2xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Pengaturan Lainnya</div>
        <div class="grid sm:grid-cols-3 gap-4">
          <NuxtLink
            v-for="k in kategoriLain"
            :key="k.title"
            :to="k.to"
            class="group bg-white p-4 transition"
            style="border: 1px solid #D1D5DB; border-radius: 8px;"
          >
            <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :class="k.cls">
              <component :is="k.icon" style="width: 18px; height: 18px;" />
            </div>
            <div class="mt-2.5 text-sm font-semibold flex items-center gap-1" style="color: #0F172A;">
              {{ k.title }}
              <ChevronRight class="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" style="color: #D1D5DB;" />
            </div>
            <p class="mt-1 text-2xs leading-relaxed" style="color: #6B7280;">{{ k.desc }}</p>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>
