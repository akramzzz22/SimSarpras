<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { AlertTriangle, Search, Loader2, CheckCircle2, QrCode } from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'

definePageMeta({ layout: 'mobile', middleware: ['auth'], title: 'Lapor Kerusakan' })

const admin = useAdminService()

const barangList = ref<Barang[]>([])
const search = ref('')
const barangId = ref('')
const deskripsi = ref('')
const saving = ref(false)
const success = ref(false)
const error = ref<string | null>(null)
const loaded = ref(false)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return barangList.value
  return barangList.value.filter((b) => b.nama.toLowerCase().includes(q) || (b.kode_qr ?? '').toLowerCase().includes(q))
})

const route = useRoute()

async function loadBarang() {
  if (loaded.value) return
  try {
    const res = await admin.barang.list({ per_page: 100 })
    barangList.value = res.data
    loaded.value = true
    // Deep-link dari scan QR: pilih barang berdasarkan kode
    const kode = route.query.kode
    if (kode) {
      const found = barangList.value.find((b) => (b.kode_qr ?? '').toLowerCase() === String(kode).toLowerCase())
      if (found) {
        barangId.value = String(found.id)
        search.value = found.nama
      }
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat daftar barang.'
  }
}

async function submit() {
  if (!barangId.value || !deskripsi.value.trim()) {
    error.value = 'Pilih barang dan isi deskripsi kerusakan.'
    return
  }
  saving.value = true
  error.value = null
  success.value = false
  try {
    await admin.laporan.create({
      barang_id: Number(barangId.value),
      deskripsi: deskripsi.value
    })
    success.value = true
    deskripsi.value = ''
    barangId.value = ''
    search.value = ''
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal mengirim laporan.'
  } finally {
    saving.value = false
  }
}

onMounted(loadBarang)
</script>

<template>
  <div class="space-y-4">
    <div v-if="success" class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
      <CheckCircle2 class="w-5 h-5 text-emerald-600 shrink-0" />
      <div>
        <div class="font-semibold text-emerald-800 text-sm">Laporan terkirim!</div>
        <div class="text-xs text-emerald-600">Kerusakan akan diverifikasi oleh admin.</div>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <label class="block text-sm font-medium text-gray-700 mb-1">Cari Barang</label>
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Nama barang atau kode QR…"
          class="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500"
        />
      </div>

      <div class="mt-3 max-h-44 overflow-y-auto space-y-1.5">
        <button
          v-for="b in filtered"
          :key="b.id"
          type="button"
          class="w-full text-left px-3 py-2.5 rounded-lg border text-sm transition"
          :class="barangId === String(b.id) ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'"
          @click="barangId = String(b.id)"
        >
          <div class="font-medium">{{ b.nama }}</div>
          <div class="text-xs text-gray-400 flex items-center gap-1"><QrCode class="w-3 h-3" /> {{ b.kode_qr }}</div>
        </button>
        <div v-if="!filtered.length" class="py-6 text-center text-sm text-gray-400">Barang tidak ditemukan.</div>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi Kerusakan</label>
      <textarea
        v-model="deskripsi"
        rows="4"
        placeholder="Jelaskan kondisi kerusakan…"
        class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500"
      />
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <button
      class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
      :disabled="saving"
      @click="submit"
    >
      <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
      <AlertTriangle v-else class="w-4 h-4" />
      {{ saving ? 'Mengirim…' : 'Kirim Laporan' }}
    </button>
  </div>
</template>
