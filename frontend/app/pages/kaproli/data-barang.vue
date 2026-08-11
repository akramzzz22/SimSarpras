<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Boxes, Search, RefreshCw, QrCode, Inbox } from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'
import Pagination from '~/components/pagination.vue'

definePageMeta({ layout: 'staff', middleware: ['auth', 'kaproli'], title: 'Data Barang' })

const admin = useAdminService()

const items = ref<Barang[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')

const proliBarang = computed(() => items.value.filter((b) => b.owner_type === 'proli'))

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return proliBarang.value.filter((b) => b.nama.toLowerCase().includes(q) || (b.kode_qr ?? '').toLowerCase().includes(q))
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

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    aktif: 'bg-emerald-50 text-emerald-700',
    rusak: 'bg-rose-50 text-rose-700',
    dipinjam: 'bg-blue-50 text-blue-700',
    maintenance: 'bg-amber-50 text-amber-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
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
    <div>
      <h2 class="text-sm font-bold text-gray-900">Data Barang Proli</h2>
      <p class="text-sm text-gray-500 mt-1">Seluruh aset yang dimiliki program keahlian Anda.</p>
    </div>

    <div class="relative flex-1 max-w-sm">
      <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        v-model="search"
        placeholder="Cari barang…"
        class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Barang</th>
              <th class="px-5 py-3">Kode QR</th>
              <th class="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="b in pagedFiltered" :key="b.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Boxes class="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ b.nama }}</div>
                    <div class="text-xs text-gray-400">{{ b.kategori?.nama ?? 'Tanpa kategori' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <span class="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600">
                  <QrCode class="w-3.5 h-3.5 text-gray-400" /> {{ b.kode_qr }}
                </span>
              </td>
              <td class="px-5 py-3.5">
                <span class="text-xs px-2 py-1 rounded" :class="statusBadge(b.status)">{{ b.status }}</span>
              </td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td colspan="3" class="px-5 py-12 text-center text-gray-400">
                <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ proliBarang.length ? 'Tidak ada barang yang cocok.' : 'Belum ada barang milik proli.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>

    <!-- Pagination: 20 barang per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="barang" />
  </div>
</template>
