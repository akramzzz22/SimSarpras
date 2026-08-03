<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Wrench, CheckCircle2, Play, RefreshCw, Inbox } from 'lucide-vue-next'
import { useAdminService, type Maintenance } from '~/services/api/admin'

definePageMeta({ layout: 'staff', middleware: ['auth'], title: 'Maintenance' })

const admin = useAdminService()
const authStore = useAuthStore()

const items = ref<Maintenance[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const actionId = ref<number | null>(null)

// Jadwal yang ditugaskan ke staff ini
const myMaintenance = computed(() =>
  items.value.filter((m) => m.staff_id === authStore.user?.id && m.status !== 'selesai')
)

const badge = (s: string) => {
  const map: Record<string, string> = {
    terjadwal: 'bg-amber-100 text-amber-800',
    berlangsung: 'bg-blue-100 text-blue-800',
    selesai: 'bg-emerald-100 text-emerald-800'
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.maintenance.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat maintenance.'
  } finally {
    loading.value = false
  }
}

async function changeStatus(m: Maintenance, status: 'berlangsung' | 'selesai') {
  actionId.value = m.id
  try {
    await admin.maintenance.update(m.id, { status })
    await load()
  } catch {
    alert('Gagal mengubah status.')
  } finally {
    actionId.value = null
  }
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Maintenance</h2>
        <p class="text-sm text-gray-500 mt-1">Jadwal maintenance yang ditugaskan kepada Anda.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="m in myMaintenance" :key="m.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <Wrench class="w-5 h-5 text-violet-600" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ m.barang?.nama ?? 'Barang #' + m.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ fmt(m.tanggal_jadwal) }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="badge(m.status)">{{ m.status }}</span>
        </div>

        <p v-if="m.catatan" class="mt-3 text-sm text-gray-600 line-clamp-2">{{ m.catatan }}</p>

        <div class="mt-4">
          <button
            v-if="m.status === 'terjadwal'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            :disabled="actionId === m.id"
            @click="changeStatus(m, 'berlangsung')"
          >
            <Play v-if="actionId !== m.id" class="w-3.5 h-3.5" />
            Mulai
          </button>
          <button
            v-if="m.status === 'berlangsung'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
            :disabled="actionId === m.id"
            @click="changeStatus(m, 'selesai')"
          >
            <CheckCircle2 v-if="actionId !== m.id" class="w-3.5 h-3.5" />
            Selesaikan
          </button>
        </div>
      </div>

      <div v-if="!myMaintenance.length && !loading" class="md:col-span-2 py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">Tidak ada jadwal maintenance untuk Anda.</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
