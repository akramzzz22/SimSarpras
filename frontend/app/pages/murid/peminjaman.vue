<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ArrowLeftRight, Search, Loader2, CheckCircle2, QrCode, Camera, X, LayoutGrid, Warehouse, Boxes, Clock, Check } from 'lucide-vue-next'
import { useAdminService, type Barang, type Peminjaman, type BarangJadwal } from '~/services/api/admin'
import { fmtJam } from '~/utils/format'

definePageMeta({ layout: 'mobile', middleware: ['auth'], title: 'Peminjaman' })

const admin = useAdminService()
const authStore = useAuthStore()

const barangList = ref<Barang[]>([])
const myRequests = ref<Peminjaman[]>([])
const search = ref('')
const selectedBarangIds = ref<number[]>([])
const tanggalPinjam = ref('')
const selectedSlot = ref<BarangJadwal | null>(null)
const slotList = ref<BarangJadwal[]>([])
const loadingSlots = ref(false)
const keperluan = ref('')
const fotoPinjam = ref('')
const saving = ref(false)
const success = ref(false)
const error = ref<string | null>(null)
const loaded = ref(false)

// Filter sumber barang: Semua / Sarpras / Proli
const sumberFilter = ref<'all' | 'sarpras' | 'proli'>('all')
const proliFilter = ref('')
const proliOptions = ref<{ value: number; label: string }[]>([])

const availableBarang = computed(() => {
  const q = search.value.toLowerCase()
  return barangList.value.filter((b) => {
    if (b.status !== 'aktif') return false
    if (b.bisa_dipinjam === false) return false
    if (sumberFilter.value === 'sarpras' && b.owner_type !== 'sarpras') return false
    if (sumberFilter.value === 'proli') {
      if (b.owner_type !== 'proli') return false
      if (proliFilter.value && b.proli_id !== Number(proliFilter.value)) return false
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

function toggleBarang(id: number) {
  selectedBarangIds.value = selectedBarangIds.value.includes(id)
    ? selectedBarangIds.value.filter((x) => x !== id)
    : [...selectedBarangIds.value, id]
}

// Saat filter sumber/proli berubah, lepas pilihan barang yang mungkin sudah tidak tampil.
watch([sumberFilter, proliFilter], () => {
  selectedBarangIds.value = []
})

// Muat slot ketersediaan mengikuti barang pertama yang dipilih + tanggal (pola booking).
// Slot harus tersedia untuk SEMUA barang dalam paket — dicek lagi oleh server saat mengajukan.
async function loadSlots() {
  selectedSlot.value = null
  slotList.value = []
  if (!selectedBarangIds.value.length || !tanggalPinjam.value) return
  loadingSlots.value = true
  error.value = null
  try {
    const barangUtama = selectedBarangIds.value[0]
    if (!barangUtama) return
    slotList.value = await admin.barangJadwal.ketersediaan(barangUtama, tanggalPinjam.value)
  } catch (e: any) {
    slotList.value = []
    error.value = e?.data?.message ?? 'Gagal memuat slot ketersediaan.'
  } finally {
    loadingSlots.value = false
  }
}

// Saat pilihan barang/tanggal berubah, reset pilihan slot dan hapus pesan error.
watch([() => selectedBarangIds.value.join(','), tanggalPinjam], () => {
  loadSlots()
})

// Status tampilan tiap slot
const slotBadge = (s: BarangJadwal) => {
  const map: Record<string, { label: string; cls: string }> = {
    available: { label: 'Tersedia', cls: 'bg-emerald-50 text-emerald-700' },
    istirahat: { label: 'Istirahat', cls: 'bg-amber-50 text-amber-700' },
    tidak_tersedia: { label: 'Tidak Tersedia', cls: 'bg-gray-100 text-gray-500' },
    booked: { label: 'Sudah dibooking', cls: 'bg-rose-50 text-rose-700' }
  }
  return map[s.status] ?? { label: s.status, cls: 'bg-gray-50 text-gray-700' }
}

const slotBtnCls = (s: BarangJadwal) => {
  if (s.status !== 'available') return 'border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed'
  if (selectedSlot.value?.id === s.id) return 'border-blue-600 bg-blue-600 text-white shadow-md'
  return 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50'
}

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
    menunggu: 'bg-amber-50 text-amber-700',
    disetujui: 'bg-blue-50 text-blue-700',
    dipinjam: 'bg-violet-50 text-violet-700',
    dikembalikan: 'bg-emerald-50 text-emerald-700',
    ditolak: 'bg-rose-50 text-rose-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const jenisBadge = (j?: string) =>
  j === 'eskul'
    ? { label: 'Eskul', cls: 'bg-violet-50 text-violet-700' }
    : { label: 'Pembelajaran', cls: 'bg-blue-50 text-blue-700' }

const route = useRoute()

async function load() {
  try {
    const [b, p, pl] = await Promise.all([
      admin.barang.list({ per_page: 100 }),
      admin.peminjaman.list({ per_page: 100 }),
      admin.master.list('proli', { per_page: 100 })
    ])
    barangList.value = b.data
    myRequests.value = p.data.filter((x) => x.peminjam_id === authStore.user?.id)
    proliOptions.value = pl.data.map((x: any) => ({ value: x.id, label: x.nama }))
    loaded.value = true
    // Deep-link dari scan QR: pilih barang berdasarkan kode
    const kode = route.query.kode
    if (kode) {
      const found = barangList.value.find((x) => (x.kode_qr ?? '').toLowerCase() === String(kode).toLowerCase())
      if (found) {
        if (found.bisa_dipinjam === false) {
          error.value = 'Barang ini tidak bisa dipinjam.'
        } else {
          toggleBarang(found.id)
          search.value = found.nama
        }
      }
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data.'
  }
}

async function submit() {
  if (!selectedBarangIds.value.length || !tanggalPinjam.value || !selectedSlot.value) {
    error.value = 'Pilih minimal satu barang, tanggal, dan slot waktu yang tersedia.'
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
      barang_ids: selectedBarangIds.value,
      tanggal_pinjam: tanggalPinjam.value,
      jam_mulai: selectedSlot.value.jam_mulai,
      jam_selesai: selectedSlot.value.jam_selesai,
      jenis: 'pembelajaran',
      penanggung_jawab: null,
      keperluan: keperluan.value.trim() || null,
      foto_pinjam: fotoPinjam.value
    })
    success.value = true
    selectedBarangIds.value = []
    tanggalPinjam.value = ''
    selectedSlot.value = null
    slotList.value = []
    keperluan.value = ''
    fotoPinjam.value = ''
    await load()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal mengajukan peminjaman.'
    loadSlots()
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

    <div class="bg-white p-4" style="border: 1px solid #D1D5DB; border-radius: 8px;">
      <h3 class="font-semibold text-sm mb-3" style="color: #0F172A;">Ajukan Peminjaman</h3>

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

      <label class="block text-sm font-medium text-gray-700 mb-1 mt-3">Cari Barang</label>
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Nama barang atau kode QR…"
          class="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Pilih barang (boleh lebih dari satu = paket) -->
      <div class="mt-3 max-h-44 overflow-y-auto space-y-1.5">
        <label
          v-for="b in availableBarang"
          :key="b.id"
          class="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-sm transition cursor-pointer select-none"
          :class="selectedBarangIds.includes(b.id) ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
        >
          <input
            type="checkbox"
            class="w-4 h-4 mt-0.5 rounded shrink-0"
            style="accent-color: #2563EB;"
            :checked="selectedBarangIds.includes(b.id)"
            @change="toggleBarang(b.id)"
          />
          <span class="min-w-0">
            <span class="block font-medium">{{ b.nama }}</span>
            <span class="text-xs text-gray-400 flex items-center gap-1"><QrCode class="w-3 h-3" /> {{ b.kode_qr }}</span>
          </span>
        </label>
        <div v-if="!availableBarang.length" class="py-6 text-center text-sm text-gray-400">Tidak ada barang tersedia.</div>
      </div>
      <div
        v-if="selectedBarangIds.length"
        class="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 text-blue-700 text-2xs font-semibold"
      >
        <Check class="w-3 h-3" />
        {{ selectedBarangIds.length }} barang dipilih
      </div>

      <div class="mt-3 grid grid-cols-1 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Pinjam</label>
          <input v-model="tanggalPinjam" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <!-- Pilih slot waktu (pola booking) -->
      <div v-if="selectedBarangIds.length && tanggalPinjam" class="mt-3">
        <label class="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
          <Clock class="w-3.5 h-3.5 text-gray-400" />
          Pilih Slot Waktu
        </label>

        <div v-if="loadingSlots" class="flex items-center gap-2 text-sm text-gray-400 py-3">
          <Loader2 class="w-4 h-4 animate-spin" /> Memuat slot…
        </div>

        <div v-else-if="!slotList.length" class="rounded-xl border border-dashed border-gray-200 px-3 py-5 text-center text-sm text-gray-400">
          Belum ada jadwal booking untuk barang ini pada hari tersebut.
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="s in slotList"
            :key="s.id"
            type="button"
            :disabled="s.status !== 'available'"
            class="w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm transition"
            :class="slotBtnCls(s)"
            @click="selectedSlot = s"
          >
            <span class="font-semibold tabular-nums">{{ fmtJam(s.jam_mulai) }} – {{ fmtJam(s.jam_selesai) }}</span>
            <span class="text-2xs px-2 py-0.5 rounded shrink-0" :class="slotBadge(s).cls">
              {{ slotBadge(s).label }}
            </span>
          </button>
          <p class="text-2xs text-gray-400 leading-relaxed">
            <span class="text-emerald-600 font-medium">Hijau</span> = tersedia •
            <span class="text-rose-500 font-medium">Merah</span> = sudah dibooking •
            slot harus tersedia untuk semua barang (dicek saat mengajukan).
          </p>
        </div>
      </div>

      <!-- Keperluan (otomatis masuk ke surat peminjaman) -->
      <div class="mt-3">
        <label class="block text-sm font-medium text-gray-700 mb-1">Keperluan</label>
        <input
          v-model="keperluan"
          placeholder="Contoh: Praktik mata pelajaran Jaringan"
          class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="mt-1 text-xs text-gray-400">Akan otomatis tercantum di surat peminjaman barang.</p>
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
        {{ saving ? 'Mengirim…' : selectedBarangIds.length > 1 ? `Ajukan Paket (${selectedBarangIds.length} Barang)` : 'Ajukan Peminjaman' }}
      </button>
    </div>

    <!-- Permintaan saya -->
    <div class="bg-white" style="border: 1px solid #D1D5DB; border-radius: 8px; overflow: hidden;">
      <div class="px-4 py-3" style="border-bottom: 1px solid #E5E7EB;">
        <h3 class="font-semibold text-sm" style="color: #0F172A;">Permintaan Saya</h3>
      </div>
      <div class="divide-y divide-gray-50">          <div v-for="p in myRequests" :key="p.id" class="px-4 py-3 flex items-center gap-3" style="border-bottom: 1px solid #F3F4F6;">
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium flex items-center gap-1.5" style="color: #0F172A;">
              {{ p.barang?.nama ?? 'Barang #' + p.barang_id }}
              <span class="text-2xs px-1.5 py-0.5 rounded shrink-0" :class="jenisBadge(p.jenis).cls">{{ jenisBadge(p.jenis).label }}</span>
            </div>
            <div class="text-xs" style="color: #9CA3AF;">
              {{ p.tanggal_pinjam }} • {{ fmtJam(p.jam_mulai) }} – {{ fmtJam(p.jam_selesai) }}
              <span v-if="p.penanggung_jawab"> • PJ: {{ p.penanggung_jawab }}</span>
            </div>
          </div>
            <span class="text-xs px-2 py-1 rounded shrink-0" :class="badge(p.status)">{{ p.status }}</span>
          </div>
          <div v-if="!myRequests.length" class="px-4 py-8 text-center text-sm" style="color: #9CA3AF;">Belum ada permintaan.</div>
        </div>
      </div>
  </div>
</template>
