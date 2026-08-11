<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { History, RefreshCw, Inbox, Search, Fingerprint } from 'lucide-vue-next'
import { useAdminService, type ActivityLog } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Log Aktivitas' })

const admin = useAdminService()

const items = ref<ActivityLog[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const search = ref('')
const filterAction = ref('all')

const actions = ['login', 'logout', 'create', 'update', 'delete', 'approve', 'reject', 'kembali', 'laporan', 'verifikasi', 'mutasi', 'permission']

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((l) => {
    const matchAction = filterAction.value === 'all' || l.action === filterAction.value
    const matchQ =
      !q ||
      (l.description ?? '').toLowerCase().includes(q) ||
      (l.user?.name ?? '').toLowerCase().includes(q)
    return matchAction && matchQ
  })
})

const page = ref(1)
const PER_PAGE = 20
const pagedFiltered = computed(() => filtered.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE))
watch(filtered, () => { page.value = 1 })

const actionBadge = (a: string) => {
  const map: Record<string, string> = {
    login: 'bg-emerald-50 text-emerald-700',
    logout: 'bg-gray-50 text-gray-700',
    create: 'bg-blue-50 text-blue-700',
    update: 'bg-amber-50 text-amber-700',
    delete: 'bg-rose-50 text-rose-700',
    approve: 'bg-emerald-50 text-emerald-700',
    reject: 'bg-rose-50 text-rose-700',
    kembali: 'bg-teal-50 text-teal-700',
    laporan: 'bg-red-50 text-red-700',
    verifikasi: 'bg-violet-50 text-violet-700',
    mutasi: 'bg-cyan-50 text-cyan-700',
    permission: 'bg-purple-50 text-purple-700'
  }
  return map[a] ?? 'bg-gray-50 text-gray-700'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.activityLogs.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat log aktivitas.'
  } finally {
    loading.value = false
  }
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Log Aktivitas</h2>
        <p class="text-sm text-gray-500 mt-1">Riwayat aktivitas pengguna: login, perubahan data, persetujuan, dan lainnya.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <!-- Filter -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input v-model="search" placeholder="Cari aksi, deskripsi, atau user…" class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500" />
      </div>
      <select
        v-model="filterAction"
        class="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-red-500"
      >
        <option value="all">Semua Aksi</option>
        <option v-for="a in actions" :key="a" :value="a">{{ a }}</option>
      </select>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Waktu</th>
              <th class="px-5 py-3">User</th>
              <th class="px-5 py-3">Aksi</th>
              <th class="px-5 py-3">Deskripsi</th>
              <th class="px-5 py-3">IP</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="l in pagedFiltered" :key="l.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{{ fmt(l.created_at) }}</td>
              <td class="px-5 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-xs font-semibold text-red-600 shrink-0">
                    {{ (l.user?.name ?? 'S').charAt(0).toUpperCase() }}
                  </div>
                  <span class="text-gray-800">{{ l.user?.name ?? 'Sistem' }}</span>
                </div>
              </td>
              <td class="px-5 py-3"><span class="text-xs px-2 py-1 rounded" :class="actionBadge(l.action)">{{ l.action }}</span></td>
              <td class="px-5 py-3 text-gray-700">{{ l.description ?? '—' }}</td>
              <td class="px-5 py-3">
                <span class="inline-flex items-center gap-1 text-xs text-gray-400"><Fingerprint class="w-3 h-3" /> {{ l.ip_address ?? '—' }}</span>
              </td>
            </tr>
            <tr v-if="!filtered.length && !loading">
              <td colspan="5" class="px-5 py-12 text-center text-gray-400">
                <History class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ items.length ? 'Tidak ada log yang cocok.' : 'Belum ada aktivitas tercatat.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>

    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" label="log" />
  </div>
</template>
