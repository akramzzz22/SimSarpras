<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Search, RefreshCw, Inbox, CheckCircle2, XCircle, PackageCheck, AlertTriangle, Loader2 } from 'lucide-vue-next'
import { useAdminService, type Peminjaman } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

const props = defineProps<{
  mode: 'semua' | 'sedang' | 'terlambat' | 'riwayat'
  title: string
  description?: string
}>()

const admin = useAdminService()

const items = ref<Peminjaman[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const actionId = ref<number | null>(null)

// ---- Parameter filter per mode ----
const filterParams = computed<Record<string, any>>(() => {
  switch (props.mode) {
    case 'sedang':
      return { status_in: 'disetujui,dipinjam' }
    case 'terlambat':
      return { terlambat: 1 }
    case 'riwayat':
      return { status_in: 'dikembalikan,ditolak' }
    default:
      return {}
  }
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((p) => {
    const matchQ =
      !q ||
      (p.barang?.nama ?? '').toLowerCase().includes(q) ||
      (p.peminjam?.name ?? '').toLowerCase().includes(q)
    const matchLambat = props.mode !== 'terlambat' || p.terlambat === true
    return matchQ && matchLambat
  })
})

const page = ref(1)
const PER_PAGE = 20
const pagedFiltered = computed(() => filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))
watch(filtered, () => { page.value = 1 })

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.peminjaman.list({ per_page: 100, ...filterParams.value })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data peminjaman.'
  } finally {
    loading.value = false
  }
}

async function approve(p: Peminjaman) {
  actionId.value = p.id
  try {
    await admin.peminjaman.approve(p.id)
    await load()
  } catch (e: any) {
    alert(e?.data?.message ?? 'Gagal menyetujui peminjaman.')
  } finally {
    actionId.value = null
  }
}

async function reject(p: Peminjaman) {
  actionId.value = p.id
  try {
    await admin.peminjaman.reject(p.id)
    await load()
  } catch (e: any) {
    alert(e?.data?.message ?? 'Gagal menolak peminjaman.')
  } finally {
    actionId.value = null
  }
}

async function kembalikan(p: Peminjaman) {
  if (!confirm(`Konfirmasi pengembalian barang "${p.barang?.nama ?? ''}"?`)) return
  actionId.value = p.id
  try {
    await admin.peminjaman.kembalikan(p.id, {})
    await load()
  } catch (e: any) {
    alert(e?.data?.message ?? 'Gagal mencatat pengembalian.')
  } finally {
    actionId.value = null
  }
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-50 text-amber-700',
    disetujui: 'bg-red-50 text-red-700',
    ditolak: 'bg-rose-50 text-rose-700',
    dipinjam: 'bg-violet-50 text-violet-700',
    dikembalikan: 'bg-emerald-50 text-emerald-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const fmtTanggal = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')
const fmtJam = (j?: string | null) => j ?? '-'

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-sm font-bold text-gray-900">{{ title }}</h2>
      <p v-if="description" class="text-sm text-gray-500 mt-1">{{ description }}</p>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="search" placeholder="Cari barang atau peminjam…" class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" />
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- Table -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Barang</th>
              <th class="px-5 py-3">Peminjam</th>
              <th class="px-5 py-3">Jadwal</th>
              <th class="px-5 py-3">Status</th>
              <th v-if="mode !== 'riwayat'" class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="p in pagedFiltered" :key="p.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3.5">
                <div class="font-medium text-gray-900">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  {{ p.keperluan ?? 'Peminjaman' }}
                  <span v-if="p.jenis === 'eskul'" class="text-violet-500">• Eskul</span>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <div class="text-gray-800">{{ p.peminjam?.name ?? 'User' }}</div>
                <div class="text-xs text-gray-400">{{ p.peminjam?.kelas ?? '' }}</div>
              </td>
              <td class="px-5 py-3.5 text-gray-600">
                {{ fmtTanggal(p.tanggal_pinjam) }}
                <span class="text-xs text-gray-400">• {{ fmtJam(p.jam_mulai) }}-{{ fmtJam(p.jam_selesai) }}</span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-xs px-2 py-1 rounded" :class="statusBadge(p.status)">{{ p.status }}</span>
                  <span
                    v-if="p.terlambat"
                    class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-rose-50 text-rose-700"
                    title="Terlambat dikembalikan"
                  >
                    <AlertTriangle class="w-3 h-3" /> Terlambat
                  </span>
                </div>
              </td>
              <td v-if="mode !== 'riwayat'" class="px-5 py-3.5 text-right whitespace-nowrap">
                <button
                  v-if="p.status === 'menunggu'"
                  class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                  :disabled="actionId === p.id"
                  @click="approve(p)"
                >
                  <Loader2 v-if="actionId === p.id" class="w-3.5 h-3.5 animate-spin" />
                  <CheckCircle2 v-else class="w-3.5 h-3.5" />
                  Setujui
                </button>
                <button
                  v-if="p.status === 'menunggu'"
                  class="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 transition disabled:opacity-50"
                  :disabled="actionId === p.id"
                  @click="reject(p)"
                >
                  <XCircle class="w-3.5 h-3.5" />
                  Tolak
                </button>
                <button
                  v-if="['disetujui', 'dipinjam'].includes(p.status)"
                  class="ml-1 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                  :disabled="actionId === p.id"
                  @click="kembalikan(p)"
                >
                  <Loader2 v-if="actionId === p.id" class="w-3.5 h-3.5 animate-spin" />
                  <PackageCheck v-else class="w-3.5 h-3.5" />
                  Kembalikan
                </button>
              </td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td :colspan="mode === 'riwayat' ? 4 : 5" class="px-5 py-12 text-center text-gray-400">
                <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ items.length ? 'Tidak ada data yang cocok.' : 'Belum ada data peminjaman.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>

    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="peminjaman" />
  </div>
</template>
