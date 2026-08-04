<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Printer, ArrowLeft, Loader2, FileText } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useAdminService, type Peminjaman } from '~/services/api/admin'
import { sekolah } from '~/config/sekolah'

definePageMeta({ layout: false, middleware: ['auth'], title: 'Surat Peminjaman' })

const route = useRoute()
const admin = useAdminService()
const authStore = useAuthStore()

const data = ref<Peminjaman | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const id = computed(() => Number(route.params.id))

// Nomor surat otomatis: SPB/xxx/{kode}/tahun
const nomorSurat = computed(() => {
  if (!data.value) return ''
  const tahun = new Date().getFullYear()
  return `SPB/${String(data.value.id).padStart(3, '0')}/${sekolah.kodeSurat}/${tahun}`
})

const tanggalPanjang = computed(() => {
  const d = data.value?.tanggal_pinjam
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

// Tombol kembali: ke halaman riwayat sesuai role, atau history browser
const backTarget = computed(() => {
  const role = authStore.role
  if (role === 'admin' || role === 'kaproli' || role === 'staff_sarpras') return '/admin/peminjaman/approval'
  if (role === 'murid') return '/murid/riwayat'
  return '/guru/riwayat'
})

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await admin.peminjaman.show(id.value)
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data peminjaman.'
  } finally {
    loading.value = false
  }
}

function cetak() {
  window.print()
}

onMounted(load)
</script>

<template>
  <div class="min-h-screen bg-gray-100 print:bg-white">
    <!-- Toolbar (disembunyikan saat print) -->
    <div class="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 print:hidden">
      <div class="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
        <NuxtLink
          :to="backTarget"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <ArrowLeft class="w-4 h-4" />
          Kembali
        </NuxtLink>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-gray-900 truncate">Surat Peminjaman Barang</div>
          <div class="text-xs text-gray-400 truncate">Periksa, lalu cetak / simpan sebagai PDF.</div>
        </div>
        <button
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
          @click="cetak"
        >
          <Printer class="w-4 h-4" />
          Cetak / PDF
        </button>
      </div>
    </div>

    <div class="py-6 px-4 print:py-0 print:px-0">
      <div v-if="loading" class="py-20 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
        <Loader2 class="w-4 h-4 animate-spin" /> Memuat surat…
      </div>

      <p v-else-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 max-w-3xl mx-auto">{{ error }}</p>

      <!-- Surat -->
      <article
        v-else-if="data"
        class="bg-white max-w-3xl mx-auto rounded-2xl shadow-sm p-8 sm:p-12 print:rounded-none print:shadow-none print:p-8"
      >
        <!-- Kop surat -->
        <header class="text-center border-b-4 border-double border-gray-900 pb-4">
          <h1 class="text-2xl font-bold text-gray-900 uppercase tracking-wide">{{ sekolah.nama }}</h1>
          <p class="text-sm text-gray-600 mt-1">{{ sekolah.alamat }}</p>
          <p class="text-xs text-gray-500 mt-0.5">NPSN: {{ sekolah.npsn }} • Telp: {{ sekolah.telepon }}</p>
        </header>

        <!-- Nomor & perihal -->
        <div class="mt-6 space-y-1 text-sm text-gray-800">
          <p>Nomor: {{ nomorSurat }}</p>
          <p>Lampiran: -</p>
          <p>Perihal: <b>Permohonan Peminjaman Barang</b></p>
        </div>

        <div class="mt-6 text-sm text-gray-800 space-y-1">
          <p>Kepada Yth.</p>
          <p>Pengelola Sarana dan Prasarana</p>
          <p>di {{ sekolah.nama }}</p>
        </div>

        <div class="mt-6 text-sm text-gray-800 leading-relaxed">
          <p>Dengan hormat,</p>
          <p class="mt-2">
            Sehubungan dengan kegiatan pembelajaran, kami yang bertanda tangan di bawah ini mengajukan
            permohonan peminjaman barang sebagai berikut:
          </p>
        </div>

        <!-- Data peminjam -->
        <table class="mt-5 w-full text-sm text-gray-800">
          <tbody>
            <tr>
              <td class="py-1 pr-4 w-36 align-top">Nama</td>
              <td class="py-1 pr-2 w-3 align-top">:</td>
              <td class="py-1 align-top">{{ data.peminjam?.name ?? '-' }}</td>
            </tr>
            <tr v-if="data.peminjam?.kelas">
              <td class="py-1 pr-4 align-top">Kelas</td>
              <td class="py-1 pr-2 align-top">:</td>
              <td class="py-1 align-top">{{ data.peminjam.kelas }}</td>
            </tr>
            <tr>
              <td class="py-1 pr-4 align-top">Tanggal</td>
              <td class="py-1 pr-2 align-top">:</td>
              <td class="py-1 align-top">{{ tanggalPanjang }}</td>
            </tr>
            <tr>
              <td class="py-1 pr-4 align-top">Waktu</td>
              <td class="py-1 pr-2 align-top">:</td>
              <td class="py-1 align-top">Jam ke-{{ data.jam_mulai }} s.d. Jam ke-{{ data.jam_selesai }}</td>
            </tr>
            <tr>
              <td class="py-1 pr-4 align-top">Keperluan</td>
              <td class="py-1 pr-2 align-top">:</td>
              <td class="py-1 align-top">{{ data.keperluan || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Data barang -->
        <table class="mt-4 w-full text-sm text-gray-800">
          <thead>
            <tr class="border-y border-gray-800">
              <th class="py-2 pr-4 text-left font-semibold w-12">No</th>
              <th class="py-2 pr-4 text-left font-semibold">Nama Barang</th>
              <th class="py-2 pr-4 text-left font-semibold">Kode</th>
              <th class="py-2 text-left font-semibold">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="py-2 pr-4">1</td>
              <td class="py-2 pr-4">
                {{ data.barang?.nama ?? 'Barang #' + data.barang_id }}
                <span v-if="data.barang?.kategori" class="block text-xs text-gray-500">{{ data.barang.kategori.nama }}</span>
              </td>
              <td class="py-2 pr-4 font-mono text-xs">{{ data.barang?.kode_qr ?? '-' }}</td>
              <td class="py-2">1 unit</td>
            </tr>
          </tbody>
        </table>

        <div class="mt-6 text-sm text-gray-800 leading-relaxed">
          <p>
            Demikian permohonan ini kami sampaikan. Besar harapan kami kiranya Bapak/Ibu berkenan
            menyetujui peminjaman barang tersebut. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.
          </p>
        </div>

        <!-- Tanda tangan -->
        <div class="mt-10 grid grid-cols-2 gap-8 text-sm text-gray-800">
          <div class="text-center">
            <p class="mb-16">Pemohon,</p>
            <p class="font-semibold underline">{{ data.peminjam?.name ?? '................' }}</p>
          </div>
          <div class="text-center">
            <p class="mb-16">{{ sekolah.pjSarpras }}</p>
            <p class="font-semibold underline">{{ data.penyetuju?.name ?? '................' }}</p>
          </div>
        </div>
      </article>

      <div v-else class="max-w-3xl mx-auto py-16 text-center text-gray-400 flex flex-col items-center gap-2">
        <FileText class="w-10 h-10 text-gray-300" />
        Data tidak ditemukan.
      </div>
    </div>
  </div>
</template>

<style>
/* Aturan cetak: pastikan hanya surat yang tercetak, tanpa warna latar */
@media print {
  body {
    background: #fff !important;
  }
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
