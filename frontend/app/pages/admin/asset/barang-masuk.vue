<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { PackagePlus, Plus, Search, RefreshCw, Inbox, Loader2, Trash2 } from 'lucide-vue-next'
import { useAdminService, type MutasiBarang } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Barang Masuk' })

const admin = useAdminService()

const items = ref<MutasiBarang[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const search = ref('')
const showForm = ref(false)

const barangOptions = ref<{ value: number; label: string }[]>([])

const form = ref({ barang_id: '', tanggal: new Date().toISOString().slice(0, 10), jumlah: '1', keterangan: '' })

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((m) => !q || (m.barang?.nama ?? '').toLowerCase().includes(q))
})

const page = ref(1)
const PER_PAGE = 20
const pagedFiltered = computed(() => filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))
watch(filtered, () => { page.value = 1 })

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.mutasi.list({ jenis: 'masuk', per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat riwayat barang masuk.'
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  const res = await admin.barang.list({ per_page: 100 })
  barangOptions.value = res.data.map((b: any) => ({ value: b.id, label: b.nama }))
}

async function submit() {
  if (!form.value.barang_id) { formError.value = 'Pilih barang terlebih dahulu.'; return }
  saving.value = true
  formError.value = null
  try {
    await admin.mutasi.create({
      barang_id: Number(form.value.barang_id),
      jenis: 'masuk',
      tanggal: form.value.tanggal,
      jumlah: Number(form.value.jumlah) || 1,
      keterangan: form.value.keterangan || null
    })
    showForm.value = false
    form.value = { barang_id: '', tanggal: new Date().toISOString().slice(0, 10), jumlah: '1', keterangan: '' }
    await load()
  } catch (e: any) {
    formError.value = e?.data?.message ?? 'Gagal mencatat barang masuk.'
  } finally {
    saving.value = false
  }
}

async function remove(m: MutasiBarang) {
  if (!confirm('Yakin ingin menghapus catatan barang masuk ini?')) return
  try {
    await admin.mutasi.remove(m.id)
    await load()
  } catch {
    alert('Gagal menghapus catatan.')
  }
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(() => { load(); loadOptions().catch(() => {}) })
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Barang Masuk</h2>
        <p class="text-sm text-gray-500 mt-1">Catat barang yang diterima (pengadaan, sumbangan, atau pengembalian) ke inventaris.</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition shadow-sm"
        @click="showForm = !showForm"
      >
        <Plus class="w-4 h-4" />
        Catat Barang Masuk
      </button>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <PackagePlus class="w-4 h-4 text-emerald-600" /> Catat Barang Masuk
      </h3>
      <form class="grid sm:grid-cols-2 gap-4" @submit.prevent="submit">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Barang <span class="text-rose-500">*</span></label>
          <select v-model="form.barang_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="">— Pilih Barang —</option>
            <option v-for="o in barangOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Masuk</label>
          <input v-model="form.tanggal" type="date" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
          <input v-model="form.jumlah" type="number" min="1" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
          <textarea v-model="form.keterangan" rows="2" placeholder="Contoh: Pengadaan BOS tahap 2…" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <p v-if="formError" class="sm:col-span-2 text-sm text-rose-600">{{ formError }}</p>
        <div class="sm:col-span-2 flex gap-3">
          <button type="submit" :disabled="saving" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60">
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            {{ saving ? 'Menyimpan…' : 'Simpan' }}
          </button>
          <button type="button" class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50" @click="showForm = false">Batal</button>
        </div>
      </form>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="search" placeholder="Cari barang…" class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" />
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load"><RefreshCw class="w-4 h-4" /></button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- List -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Barang</th>
              <th class="px-5 py-3">Tanggal</th>
              <th class="px-5 py-3">Jumlah</th>
              <th class="px-5 py-3">Keterangan</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="m in pagedFiltered" :key="m.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3.5 font-medium text-gray-900">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</td>
              <td class="px-5 py-3.5 text-gray-500">{{ fmt(m.tanggal) }}</td>
              <td class="px-5 py-3.5">
                <span class="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700">+{{ m.jumlah }}</span>
              </td>
              <td class="px-5 py-3.5 text-gray-600">{{ m.keterangan ?? '—' }}</td>
              <td class="px-5 py-3.5 text-right">
                <button class="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Hapus" @click="remove(m)"><Trash2 class="w-4 h-4" /></button>
              </td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td colspan="5" class="px-5 py-12 text-center text-gray-400">
                <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ items.length ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan barang masuk.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>

    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="catatan" />
  </div>
</template>
