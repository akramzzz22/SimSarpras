<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ClipboardCheck, Search, RefreshCw, Loader2, Inbox, CheckCircle2, AlertTriangle } from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Stock Opname' })

const admin = useAdminService()

const items = ref<(Barang & { checked?: boolean })[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const savingId = ref<number | null>(null)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((b) => b.nama.toLowerCase().includes(q) || (b.kode_qr ?? '').toLowerCase().includes(q))
})

const progress = computed(() => {
  const total = items.value.length
  const checked = items.value.filter((b) => b.checked).length
  const pct = total ? Math.round((checked / total) * 100) : 0
  return { total, checked, pct }
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.barang.list({ per_page: 100 })
    items.value = res.data.map((b: Barang) => ({ ...b, checked: b.status === 'aktif' }))
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat barang.'
  } finally {
    loading.value = false
  }
}

async function toggleStatus(b: Barang & { checked?: boolean }) {
  b.checked = !b.checked
  // Jika ditandai belum cocok -> ubah status menjadi rusak; jika cocok -> aktif
  savingId.value = b.id
  try {
    await admin.barang.update(b.id, { status: b.checked ? 'aktif' : 'rusak' })
  } catch {
    alert('Gagal menyimpan hasil opname.')
  } finally {
    savingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Stock Opname</h2>
      <p class="text-sm text-gray-500 mt-1">Verifikasi keberadaan barang secara berkala.</p>
    </div>

    <!-- Progress -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div class="flex items-center justify-between mb-2">
        <div class="text-sm font-medium text-gray-700 flex items-center gap-2">
          <ClipboardCheck class="w-4 h-4 text-blue-600" />
          Progres Opname
        </div>
        <div class="text-sm font-semibold text-gray-900">
          {{ progress.checked }} / {{ progress.total }} barang
        </div>
      </div>
      <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-emerald-500 rounded-full transition-all duration-500"
          :style="{ width: progress.pct + '%' }"
        />
      </div>
      <p v-if="progress.pct === 100 && progress.total" class="mt-2 text-xs text-emerald-600 flex items-center gap-1">
        <CheckCircle2 class="w-3.5 h-3.5" /> Opname selesai — semua barang terverifikasi.
      </p>
    </div>

    <div class="relative flex-1 max-w-sm">
      <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        v-model="search"
        placeholder="Cari barang…"
        class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- List -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <button
        v-for="b in filtered"
        :key="b.id"
        class="text-left bg-white rounded-2xl border p-4 transition hover:shadow-md"
        :class="b.checked ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'"
        @click="toggleStatus(b)"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            :class="b.checked ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'"
          >
            <Loader2 v-if="savingId === b.id" class="w-4 h-4 animate-spin" />
            <CheckCircle2 v-else-if="b.checked" class="w-4 h-4" />
            <AlertTriangle v-else class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <div class="font-medium text-sm text-gray-900 line-clamp-1">{{ b.nama }}</div>
            <div class="text-xs text-gray-400 font-mono mt-0.5">{{ b.kode_qr }}</div>
            <div class="mt-1.5 text-xs" :class="b.checked ? 'text-emerald-600' : 'text-rose-600'">
              {{ b.checked ? 'Barang cocok ✓' : 'Perlu dicek / rusak' }}
            </div>
          </div>
        </div>
      </button>

      <div v-if="!filtered.length && !loading" class="col-span-full py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">{{ items.length ? 'Tidak ada barang yang cocok.' : 'Belum ada data barang.' }}</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
