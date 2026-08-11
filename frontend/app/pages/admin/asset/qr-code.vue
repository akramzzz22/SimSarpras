<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { QrCode, Search, RefreshCw, Printer, Inbox, Download, ExternalLink } from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'QR Code' })

const admin = useAdminService()
const config = useRuntimeConfig()

const items = ref<Barang[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((b) => b.nama.toLowerCase().includes(q) || (b.kode_qr ?? '').toLowerCase().includes(q))
})

// ---- Pagination: 20 barang per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedFiltered = computed(() =>
  filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(filtered, () => {
  page.value = 1
})

// QR berisi link publik ke halaman info barang, sehingga bisa di-scan
// dari kamera HP biasa tanpa harus buka aplikasi.
function qrUrl(kode: string) {
  const link = `${config.public.appBase}/barang/${encodeURIComponent(kode)}`
  // Gunakan layanan QR publik (tanpa dependency tambahan)
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(link)}`
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.barang.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat barang.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">QR Code Barang</h2>
        <p class="text-sm text-gray-500 mt-1">Tampilkan & cetak QR code setiap barang untuk ditempel.</p>
      </div>
      <div class="flex gap-2">
        <button
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition shadow-sm"
          onclick="window.print()"
        >
          <Printer class="w-4 h-4" />
          Cetak
        </button>
        <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
          <RefreshCw class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="relative flex-1 max-w-sm">
      <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        v-model="search"
        placeholder="Cari barang…"
        class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
      />
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <div
        v-for="b in pagedFiltered"
        :key="b.id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center"
      >
        <img
          :src="qrUrl(b.kode_qr ?? '')"
          :alt="b.nama"
          class="w-32 h-32 mx-auto rounded-lg border border-gray-100"
          loading="lazy"
        />
        <div class="mt-3 font-medium text-sm text-gray-900 line-clamp-1">{{ b.nama }}</div>
        <div class="mt-1 inline-flex items-center gap-1 text-2xs font-mono text-gray-400">
          <QrCode class="w-3 h-3" />
          {{ b.kode_qr }}
        </div>
        <NuxtLink
          :to="`/barang/${encodeURIComponent(b.kode_qr ?? '')}`"
          target="_blank"
          class="mt-2 inline-flex items-center gap-1 text-2xs font-medium text-red-600 hover:text-red-700"
        >
          <ExternalLink class="w-3 h-3" />
          Lihat info saat di-scan
        </NuxtLink>
      </div>

      <div v-if="!filtered.length && !loading" class="col-span-full py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">{{ items.length ? 'Tidak ada barang yang cocok.' : 'Belum ada data barang.' }}</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

    <!-- Pagination: 20 barang per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="barang" />

    <p class="text-xs text-gray-400 flex items-center gap-1">
      <Download class="w-3 h-3" />
      QR kini berisi link info barang — scan dari kamera HP untuk langsung melihat info. Gunakan tombol Cetak, atau klik kanan gambar QR lalu simpan untuk ditempel pada barang.
    </p>
  </div>
</template>
