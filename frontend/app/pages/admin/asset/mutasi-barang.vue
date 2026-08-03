<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ArrowLeftRight, Search, RefreshCw, Inbox, QrCode } from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Mutasi Barang' })

const admin = useAdminService()

const items = ref<Barang[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const filterOwner = ref<'all' | 'sarpras' | 'proli'>('all')
const savingId = ref<number | null>(null)

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
    aktif: 'bg-emerald-100 text-emerald-800',
    rusak: 'bg-rose-100 text-rose-800',
    dipinjam: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-amber-100 text-amber-800'
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Mutasi Barang</h2>
      <p class="text-sm text-gray-500 mt-1">Catat perpindahan status barang (aktif, rusak, dipinjam, maintenance).</p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Cari barang…"
          class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="flex gap-2">
        <button
          v-for="o in ([{v:'all',l:'Semua'},{v:'sarpras',l:'Sarpras'},{v:'proli',l:'Proli'}] as const)"
          :key="o.v"
          class="px-3 py-2 rounded-xl text-sm font-medium border transition"
          :class="filterOwner === o.v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
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
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="b in filtered" :key="b.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <ArrowLeftRight class="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ b.nama }}</div>
                    <div class="text-xs text-gray-400 flex items-center gap-1">
                      <QrCode class="w-3 h-3" /> {{ b.kode_qr }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-3.5">
                <span class="text-xs px-2 py-1 rounded-full" :class="statusBadge(b.status)">{{ b.status }}</span>
              </td>
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <button
                    v-for="s in statusOptions"
                    :key="s"
                    :disabled="savingId === b.id || b.status === s"
                    class="px-2.5 py-1 rounded-lg text-xs font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed"
                    :class="b.status === s ? 'bg-gray-100 text-gray-500 border-gray-200' : 'text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'"
                    @click="updateStatus(b, s)"
                  >
                      {{ s }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td colspan="3" class="px-5 py-12 text-center text-gray-400">
                <Inbox class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ items.length ? 'Tidak ada barang yang cocok.' : 'Belum ada data barang.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>
  </div>
</template>
