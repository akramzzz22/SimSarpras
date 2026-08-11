<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Wallet, Store, Wrench, RefreshCw, Inbox, ArrowLeftRight } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'mobile', middleware: ['auth', 'kepsek'], title: 'Approval Biaya' })

const admin = useAdminService()

const maintenance = ref<any[]>([])
const peminjaman = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const tab = ref<'maintenance' | 'peminjaman'>('maintenance')

const maintenanceWithVendor = computed(() => maintenance.value.filter((m) => m.vendor_id))

const peminjamanMenunggu = computed(() => peminjaman.value.filter((p) => p.status === 'menunggu'))

// ---- Pagination: 20 data per halaman (per tab) ----
const page = ref(1)
const PER_PAGE = 20

const pagedMaintenance = computed(() =>
  maintenanceWithVendor.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

const pagedPeminjaman = computed(() =>
  peminjamanMenunggu.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(tab, () => {
  page.value = 1
})

watch([maintenanceWithVendor, peminjamanMenunggu], () => {
  page.value = 1
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const [m, p] = await Promise.all([
      admin.maintenance.list({ per_page: 100 }),
      admin.peminjaman.list({ per_page: 100 })
    ])
    maintenance.value = m.data
    peminjaman.value = p.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data.'
  } finally {
    loading.value = false
  }
}

const badge = (s: string) => {
  const map: Record<string, string> = {
    terjadwal: 'bg-amber-50 text-amber-700',
    berlangsung: 'bg-blue-50 text-blue-700',
    selesai: 'bg-emerald-50 text-emerald-700',
    menunggu: 'bg-amber-50 text-amber-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Approval Biaya</h2>
        <p class="text-xs text-gray-500 mt-0.5">Pantau biaya vendor & persetujuan yang menunggu.</p>
      </div>
      <button class="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" :class="loading ? 'animate-spin' : ''" />
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        class="px-4 py-2.5 rounded-xl text-sm font-medium border transition"
        :class="tab === 'maintenance' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="tab = 'maintenance'"
      >
        Maintenance Vendor
      </button>
      <button
        class="px-4 py-2.5 rounded-xl text-sm font-medium border transition"
        :class="tab === 'peminjaman' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
        @click="tab = 'peminjaman'"
      >
        Peminjaman Menunggu
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <template v-if="tab === 'maintenance'">
      <div class="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
        <div class="flex items-center gap-3">
          <Wallet class="w-6 h-6" />
          <div>
            <div class="text-xs text-emerald-100">Pekerjaan vendor berjalan</div>
            <div class="text-2xl font-bold">{{ maintenanceWithVendor.length }}</div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div v-for="m in pagedMaintenance" :key="m.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Store class="w-4 h-4 text-emerald-600" />
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</div>
                <div class="text-xs text-gray-400">Vendor: {{ m.vendor?.nama ?? '—' }} • {{ fmt(m.tanggal_jadwal) }}</div>
              </div>
            </div>
            <span class="text-xs px-2 py-1 rounded shrink-0" :class="badge(m.status)">{{ m.status }}</span>
          </div>
        </div>
        <div v-if="!maintenanceWithVendor.length && !loading" class="py-12 text-center text-gray-400 text-sm">
          <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" /> Belum ada pekerjaan vendor.
        </div>
      </div>
    </template>

    <template v-else>
      <div class="space-y-3">
        <div v-for="p in pagedPeminjaman" :key="p.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <ArrowLeftRight class="w-4 h-4 text-blue-600" />
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
                <div class="text-xs text-gray-400">Peminjam: {{ p.peminjam?.name ?? 'User' }}</div>
              </div>
            </div>
            <span class="text-xs px-2 py-1 rounded shrink-0" :class="badge(p.status)">{{ p.status }}</span>
          </div>
        </div>
        <div v-if="!peminjamanMenunggu.length && !loading" class="py-12 text-center text-gray-400 text-sm">
          <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" /> Tidak ada peminjaman menunggu.
        </div>
      </div>
    </template>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

    <!-- Pagination: 20 data per halaman -->
    <Pagination
      v-model:page="page"
      :total="tab === 'maintenance' ? maintenanceWithVendor.length : peminjamanMenunggu.length"
      :per-page="PER_PAGE"
      :label="tab === 'maintenance' ? 'pekerjaan' : 'peminjaman'"
    />
  </div>
</template>
