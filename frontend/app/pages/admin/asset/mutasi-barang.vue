<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ArrowLeftRight, Search, RefreshCw, Inbox, QrCode, MapPin, Loader2, X } from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'
import Pagination from '~/components/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Mutasi Barang' })

const admin = useAdminService()

const items = ref<Barang[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const filterOwner = ref<'all' | 'sarpras' | 'proli'>('all')
const savingId = ref<number | null>(null)

// ---- Pindah ruangan (mencatat mutasi 'pindah' + update lokasi barang) ----
const moveId = ref<number | null>(null)
const moveTarget = ref('')
const movingId = ref<number | null>(null)
const moveError = ref<string | null>(null)
const ruanganOptions = ref<{ value: number; label: string }[]>([])

async function loadRuangan() {
  const res = await admin.master.list('ruangan', { per_page: 100 })
  ruanganOptions.value = res.data.map((x: any) => ({ value: x.id, label: x.nama }))
}

async function pindahRuangan(b: Barang) {
  if (!moveTarget.value) { moveError.value = 'Pilih ruangan tujuan.'; return }
  movingId.value = b.id
  moveError.value = null
  try {
    await admin.mutasi.create({
      barang_id: b.id,
      jenis: 'pindah',
      tanggal: new Date().toISOString().slice(0, 10),
      jumlah: 1,
      keterangan: `Pindah dari ${b.ruangan?.nama ?? '—'} ke ruangan tujuan`,
      ruangan_asal_id: b.ruangan_id ?? null,
      ruangan_tujuan_id: Number(moveTarget.value)
    })
    moveId.value = null
    moveTarget.value = ''
    await load()
  } catch (e: any) {
    moveError.value = e?.data?.message ?? 'Gagal memindahkan barang.'
  } finally {
    movingId.value = null
  }
}

const statusOptions = ['aktif', 'rusak', 'dipinjam', 'maintenance'] as const
type BarangStatus = 'aktif' | 'rusak' | 'dipinjam' | 'maintenance'

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((b) => {
    const matchQ = !q || b.nama.toLowerCase().includes(q) || (b.kode_qr ?? '').toLowerCase().includes(q)
    const matchOwner = filterOwner.value === 'all' || b.owner_type === filterOwner.value
    return matchQ && matchOwner
  })
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

async function updateStatus(b: Barang, status: BarangStatus) {
  savingId.value = b.id
  try {
    await admin.barang.update(b.id, { status })
    await load()
  } catch {
    alert('Gagal mengubah status barang.')
  } finally {
    savingId.value = null
  }
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    aktif: 'bg-emerald-50 text-emerald-700',
    rusak: 'bg-rose-50 text-rose-700',
    dipinjam: 'bg-red-50 text-red-700',
    maintenance: 'bg-amber-50 text-amber-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

onMounted(() => {
  load()
  loadRuangan().catch(() => {})
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-sm font-bold text-gray-900">Mutasi Barang</h2>        <p class="text-sm text-gray-500 mt-1">Ubah status barang dan catat perpindahan lokasi antar ruangan.</p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Cari barang…"
          class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
      <div class="flex gap-2">
        <button
          v-for="o in ([{v:'all',l:'Semua'},{v:'sarpras',l:'Sarpras'},{v:'proli',l:'Proli'}] as const)"
          :key="o.v"
          class="px-3 py-2 rounded-xl text-sm font-medium border transition"
          :class="filterOwner === o.v ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          @click="filterOwner = o.v"
        >
          {{ o.l }}
        </button>
        <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
          <RefreshCw class="w-4 h-4" />
        </button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- Table -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Barang</th>
              <th class="px-5 py-3">Status Saat Ini</th>
              <th class="px-5 py-3">Ubah Status</th>
              <th class="px-5 py-3">Pindah Ruangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="b in pagedFiltered" :key="b.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <ArrowLeftRight class="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ b.nama }}</div>
                    <div class="text-xs text-gray-400 flex items-center gap-1">
                      <QrCode class="w-3 h-3" /> {{ b.kode_qr }} <span>•</span> <MapPin class="w-3 h-3" /> {{ b.ruangan?.nama ?? 'Tanpa ruangan' }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <span class="text-xs px-2 py-1 rounded" :class="statusBadge(b.status)">{{ b.status }}</span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <button
                    v-for="s in statusOptions"
                    :key="s"
                    :disabled="savingId === b.id || b.status === s"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed"
                    :class="b.status === s ? 'bg-gray-100 text-gray-500 border-gray-200' : 'text-gray-600 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'"
                    @click="updateStatus(b, s)"
                  >
                      {{ s }}
                  </button>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <!-- Form pindah inline -->
                <div v-if="moveId === b.id" class="flex items-center gap-1.5 flex-wrap max-w-xs">
                  <select
                    v-model="moveTarget"
                    class="rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="">— Pilih Ruangan —</option>
                    <option v-for="o in ruanganOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                  <button
                    class="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                    title="Simpan pindah"
                    :disabled="movingId === b.id"
                    @click="pindahRuangan(b)"
                  >
                    <Loader2 v-if="movingId === b.id" class="w-3.5 h-3.5 animate-spin" />
                    <ArrowLeftRight v-else class="w-3.5 h-3.5" />
                  </button>
                  <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" title="Batal" @click="moveId = null; moveTarget = ''; moveError = null">
                    <X class="w-3.5 h-3.5" />
                  </button>
                  <p v-if="moveError" class="w-full text-xs text-rose-600">{{ moveError }}</p>
                </div>
                <button
                  v-else
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
                  @click="moveId = b.id; moveTarget = ''; moveError = null"
                >
                  <MapPin class="w-3.5 h-3.5" />
                  Pindah
                </button>
              </td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td colspan="4" class="px-5 py-12 text-center text-gray-400">
                <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ items.length ? 'Tidak ada barang yang cocok.' : 'Belum ada data barang.' }}
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
