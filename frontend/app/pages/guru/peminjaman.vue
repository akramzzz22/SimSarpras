<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ArrowLeftRight, Search, Loader2, CheckCircle2, QrCode, Camera, X, AlertTriangle, LayoutGrid, Warehouse, Boxes } from 'lucide-vue-next'
import { useAdminService, type Barang, type Peminjaman } from '~/services/api/admin'

definePageMeta({ layout: 'mobile', middleware: ['auth'], title: 'Peminjaman' })

const admin = useAdminService()
const authStore = useAuthStore()

const JAM_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

const barangList = ref<Barang[]>([])
const allPeminjaman = ref<Peminjaman[]>([])
const myRequests = ref<Peminjaman[]>([])
const search = ref('')
const barangId = ref('')
const tanggalPinjam = ref('')
const jamMulai = ref('')
const jamSelesai = ref('')
const fotoPinjam = ref('')
const saving = ref(false)
const success = ref(false)
const error = ref<string | null>(null)
const loaded = ref(false)

// Filter sumber barang: Semua / Sarpras / Proli
const sumberFilter = ref<'all' | 'sarpras' | 'proli'>('all')
const proliFilter = ref('')
const proliOptions = ref<{ value: number; label: string }[]>([])
const subkategoriFilter = ref('')
const subkategoriOptions = ref<{ value: number; label: string }[]>([])

// Muat subkategori milik proli yang dipilih (untuk filter barang proli)
async function loadSubkategori() {
  subkategoriFilter.value = ''
  subkategoriOptions.value = []
  if (sumberFilter.value !== 'proli' || !proliFilter.value) return
  try {
    const res = await admin.master.list('subkategori', { per_page: 100, proli_id: proliFilter.value })
    subkategoriOptions.value = res.data.map((x: any) => ({ value: x.id, label: x.nama }))
  } catch {
    subkategoriOptions.value = []
  }
}

const availableBarang = computed(() => {
  const q = search.value.toLowerCase()
  return barangList.value.filter((b) => {
    if (b.status !== 'aktif') return false
    if (sumberFilter.value === 'sarpras' && b.owner_type !== 'sarpras') return false
    if (sumberFilter.value === 'proli') {
      if (b.owner_type !== 'proli') return false
      if (proliFilter.value && b.proli_id !== Number(proliFilter.value)) return false
      if (subkategoriFilter.value && b.subkategori_id !== Number(subkategoriFilter.value)) return false
    }
    if (q && !b.nama.toLowerCase().includes(q) && !(b.kode_qr ?? '').toLowerCase().includes(q)) return false
    return true
  })
})

const sumberOptions = [
  { v: 'all', l: 'Semua', icon: LayoutGrid },
  { v: 'sarpras', l: 'Sarpras', icon: Warehouse },
  { v: 'proli', l: 'Proli', icon: Boxes }
] as const

// Saat filter sumber/proli berubah, lepas pilihan barang yang mungkin sudah tidak tampil.
watch([sumberFilter, proliFilter], () => {
  barangId.value = ''
  loadSubkategori()
})

const jamSelesaiOptions = computed(() => {
  const m = Number(jamMulai.value)
  return m ? JAM_OPTIONS.filter((j) => j >= m) : JAM_OPTIONS
})

// Deteksi bentrok: barang terpilih sudah dipinjam pada tanggal & rentang jam tersebut
const bentrokInfo = computed(() => {
  if (!barangId.value || !tanggalPinjam.value || !jamMulai.value || !jamSelesai.value) return null
  const bid = Number(barangId.value)
  const tgl = tanggalPinjam.value
  const a = Number(jamMulai.value)
  const b = Number(jamSelesai.value)
  return allPeminjaman.value.find((p) => {
    if (p.barang_id !== bid || p.tanggal_pinjam !== tgl) return false
    if (!['menunggu', 'disetujui', 'dipinjam'].includes(p.status)) return false
    const pm = p.jam_mulai ?? 0
    const ps = p.jam_selesai ?? 0
    if (!pm || !ps) return false
    return pm < b && ps > a
  }) ?? null
})

const isBentrok = computed(() => !!bentrokInfo.value)

const fotoInput = ref<HTMLInputElement | null>(null)
const fotoUploading = ref(false)
function pickFoto() {
  fotoInput.value?.click()
}

async function onFotoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = 'File harus berupa gambar.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Ukuran foto maksimal 5MB.'
    return
  }
  fotoUploading.value = true
  error.value = null
  try {
    const res = await admin.upload(file)
    fotoPinjam.value = res.url
  } catch (err: any) {
    error.value = err?.data?.message ?? 'Gagal mengunggah foto.'
  } finally {
    fotoUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

const badge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-100 text-amber-800',
    disetujui: 'bg-blue-100 text-blue-800',
    dipinjam: 'bg-violet-100 text-violet-800',
    dikembalikan: 'bg-emerald-100 text-emerald-800',
    ditolak: 'bg-rose-100 text-rose-800'
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

const route = useRoute()

async function load() {
  try {
    const [b, p, pl] = await Promise.all([
      admin.barang.list({ per_page: 100 }),
      admin.peminjaman.list({ per_page: 100 }),
      admin.master.list('proli', { per_page: 100 })
    ])
    barangList.value = b.data
    allPeminjaman.value = p.data
    myRequests.value = p.data.filter((x) => x.peminjam_id === authStore.user?.id)
    proliOptions.value = pl.data.map((x: any) => ({ value: x.id, label: x.nama }))
    loaded.value = true
    // Deep-link dari scan QR: pilih barang berdasarkan kode
    const kode = route.query.kode
    if (kode) {
      const found = barangList.value.find((x) => (x.kode_qr ?? '').toLowerCase() === String(kode).toLowerCase())
      if (found) {
        barangId.value = String(found.id)
        search.value = found.nama
      }
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data.'
  }
}

async function submit() {
  if (!barangId.value || !tanggalPinjam.value || !jamMulai.value || !jamSelesai.value) {
    error.value = 'Lengkapi barang, tanggal, dan jam pelajaran.'
    return
  }
  if (Number(jamSelesai.value) < Number(jamMulai.value)) {
    error.value = 'Jam selesai tidak boleh sebelum jam mulai.'
    return
  }
  if (isBentrok.value) {
    error.value = 'Barang sudah dipinjam pada tanggal & jam tersebut. Pilih jadwal lain.'
    return
  }
  if (!fotoPinjam.value) {
    error.value = 'Foto barang wajib diunggah.'
    return
  }
  saving.value = true
  error.value = null
  success.value = false
  try {
    await admin.peminjaman.create({
      barang_id: Number(barangId.value),
      tanggal_pinjam: tanggalPinjam.value,
      jam_mulai: Number(jamMulai.value),
      jam_selesai: Number(jamSelesai.value),
      foto_pinjam: fotoPinjam.value
    })
    success.value = true
    barangId.value = ''
    tanggalPinjam.value = ''
    jamMulai.value = ''
    jamSelesai.value = ''
    fotoPinjam.value = ''
    await load()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal mengajukan peminjaman.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div v-if="success" class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
      <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
      <div>
        <div class="font-semibold text-emerald-800 text-sm">Pengajuan terkirim!</div>
        <div class="text-xs text-emerald-600">Menunggu persetujuan admin / ketua proli.</div>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <h3 class="font-semibold text-gray-900 text-sm mb-3">Ajukan Peminjaman</h3>

      <!-- Filter sumber barang: Semua / Sarpras / Proli -->
      <label class="block text-sm font-medium text-gray-700 mb-1">Sumber Barang</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="s in sumberOptions"
          :key="s.v"
          type="button"
          class="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-semibold transition"
          :class="sumberFilter === s.v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          @click="sumberFilter = s.v"
        >
          <component :is="s.icon" class="w-3.5 h-3.5" />
          {{ s.l }}
        </button>
      </div>

      <div v-if="sumberFilter === 'proli'" class="mt-2">
        <select
          v-model="proliFilter"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">— Semua Proli —</option>
          <option v-for="o in proliOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <div v-if="sumberFilter === 'proli' && proliFilter" class="mt-2">
        <select
          v-model="subkategoriFilter"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">— Semua Subkategori —</option>
          <option v-for="o in subkategoriOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <label class="block text-sm font-medium text-gray-700 mb-1 mt-3">Cari Barang</label>
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Nama barang atau kode QR…"
          class="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="mt-3 max-h-44 overflow-y-auto space-y-1.5">
        <button
          v-for="b in availableBarang"
          :key="b.id"
          type="button"
          class="w-full text-left px-3 py-2.5 rounded-lg border text-sm transition"
          :class="barangId === String(b.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
          @click="barangId = String(b.id)"
        >
          <div class="font-medium">{{ b.nama }}</div>
          <div class="text-xs text-gray-400 flex items-center gap-1"><QrCode class="w-3 h-3" /> {{ b.kode_qr }}</div>
        </button>
        <div v-if="!availableBarang.length" class="py-6 text-center text-sm text-gray-400">Tidak ada barang tersedia.</div>
      </div>

      <div class="mt-3 grid grid-cols-1 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Pinjam</label>
          <input v-model="tanggalPinjam" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jam Mulai (Jam ke)</label>
            <select v-model="jamMulai" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— Pilih —</option>
              <option v-for="j in JAM_OPTIONS" :key="j" :value="j">Jam ke-{{ j }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jam Selesai (Jam ke)</label>
            <select v-model="jamSelesai" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— Pilih —</option>
              <option v-for="j in jamSelesaiOptions" :key="j" :value="j">Jam ke-{{ j }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Peringatan bentrok jadwal -->
      <div v-if="isBentrok" class="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
        <AlertTriangle class="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          Barang sudah dipinjam pada jam ke-{{ bentrokInfo?.jam_mulai }} – {{ bentrokInfo?.jam_selesai }} tanggal tersebut.
          <span class="block text-xs text-rose-500">Pilih tanggal/jam lain agar tidak bentrok.</span>
        </div>
      </div>

      <!-- Upload foto wajib -->
      <div class="mt-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">Foto Barang <span class="text-rose-500">*</span></label>
        <div
          class="relative rounded-xl border-2 border-dashed p-3 text-center transition cursor-pointer"
          :class="fotoPinjam ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'"
          @click="pickFoto"
        >
          <img v-if="fotoPinjam" :src="fotoPinjam" class="max-h-40 mx-auto rounded-lg object-cover" alt="Foto barang" />
          <div v-else class="py-4">
            <Camera v-if="!fotoUploading" class="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <Loader2 v-else class="w-6 h-6 mx-auto mb-1 text-blue-500 animate-spin" />
            <p class="text-xs text-gray-500">{{ fotoUploading ? 'Mengunggah…' : 'Foto barang wajib diunggah (maks 5MB)' }}</p>
          </div>
          <button
            v-if="fotoPinjam"
            type="button"
            class="absolute top-2 right-2 p-1 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition"
            @click.stop="fotoPinjam = ''"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        <input ref="fotoInput" type="file" accept="image/*" class="hidden" :disabled="fotoUploading" @change="onFotoChange" />
      </div>

      <p v-if="error" class="mt-3 text-sm text-rose-600">{{ error }}</p>

      <button
        class="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        :disabled="saving"
        @click="submit"
      >
        <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
        <ArrowLeftRight v-else class="w-4 h-4" />
        {{ saving ? 'Mengirim…' : 'Ajukan Peminjaman' }}
      </button>
    </div>

    <!-- Permintaan saya -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-gray-100">
        <h3 class="font-semibold text-gray-900 text-sm">Permintaan Saya</h3>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="p in myRequests" :key="p.id" class="px-4 py-3 flex items-center gap-3">
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
            <div class="text-xs text-gray-400">{{ p.tanggal_pinjam }} • Jam ke-{{ p.jam_mulai }} – {{ p.jam_selesai }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="badge(p.status)">{{ p.status }}</span>
        </div>
        <div v-if="!myRequests.length" class="px-4 py-8 text-center text-sm text-gray-400">Belum ada permintaan.</div>
      </div>
    </div>
  </div>
</template>
