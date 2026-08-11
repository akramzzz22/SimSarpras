<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ClipboardList, Wrench, AlertTriangle, CheckCircle2, RefreshCw, Inbox } from 'lucide-vue-next'
import { useAdminService, type LaporanKerusakan } from '~/services/api/admin'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'staff', middleware: ['auth', 'staff'], title: 'Tugas Saya' })

const admin = useAdminService()
const authStore = useAuthStore()

const laporan = ref<LaporanKerusakan[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const actionId = ref<number | null>(null)

// Tugas: laporan yang ditugaskan ke staff ini (assigned_to = user id)
const myTasks = computed(() =>
  laporan.value.filter((l) => l.assigned_to === authStore.user?.id && l.status !== 'selesai')
)

// ---- Pagination: 20 tugas per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedTasks = computed(() =>
  myTasks.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(myTasks, () => {
  page.value = 1
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.laporan.list({ per_page: 100 })
    laporan.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat tugas.'
  } finally {
    loading.value = false
  }
}

async function changeStatus(l: LaporanKerusakan, status: 'diperbaiki' | 'selesai') {
  actionId.value = l.id
  try {
    await admin.laporan.update(l.id, { status })
    await load()
  } catch {
    alert('Gagal mengubah status.')
  } finally {
    actionId.value = null
  }
}

const badge = (s: string) => {
  const map: Record<string, string> = {
    diverifikasi: 'bg-blue-50 text-blue-700',
    diperbaiki: 'bg-violet-50 text-violet-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Tugas Saya</h2>
        <p class="text-sm text-gray-500 mt-1">Laporan kerusakan yang ditugaskan kepada Anda.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="l in pagedTasks" :key="l.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle class="w-5 h-5 text-amber-500" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">oleh {{ l.pelapor?.name ?? 'User' }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded shrink-0" :class="badge(l.status)">{{ l.status }}</span>
        </div>

        <p class="mt-3 text-sm text-gray-600 line-clamp-2">{{ l.deskripsi }}</p>

        <div class="mt-4 flex items-center gap-2">
          <button
            v-if="l.status === 'diverifikasi'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition disabled:opacity-60"
            :disabled="actionId === l.id"
            @click="changeStatus(l, 'diperbaiki')"
          >
            <Wrench v-if="actionId !== l.id" class="w-3.5 h-3.5" />
            Mulai Perbaikan
          </button>
          <button
            v-if="l.status === 'diperbaiki'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
            :disabled="actionId === l.id"
            @click="changeStatus(l, 'selesai')"
          >
            <CheckCircle2 v-if="actionId !== l.id" class="w-3.5 h-3.5" />
            Tandai Selesai
          </button>
        </div>
      </div>

      <div v-if="!myTasks.length && !loading" class="md:col-span-2 py-12 text-center">
        <ClipboardList class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">Tidak ada tugas yang ditugaskan kepada Anda.</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
      <Inbox class="w-4 h-4 animate-pulse" /> Memuat data…
    </div>

    <!-- Pagination: 20 tugas per halaman -->
    <Pagination v-model:page="page" :total="myTasks.length" :per-page="PER_PAGE" label="tugas" />
  </div>
</template>
