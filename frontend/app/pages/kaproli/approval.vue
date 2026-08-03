<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ClipboardCheck, CheckCircle2, XCircle, RefreshCw, Inbox, Loader2 } from 'lucide-vue-next'
import { useAdminService, type Peminjaman } from '~/services/api/admin'

definePageMeta({ layout: 'staff', middleware: ['auth'], title: 'Approval' })

const admin = useAdminService()

const items = ref<Peminjaman[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const actionId = ref<number | null>(null)

const pending = computed(() => items.value.filter((p) => p.status === 'menunggu'))

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.peminjaman.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat peminjaman.'
  } finally {
    loading.value = false
  }
}

async function approve(p: Peminjaman) {
  actionId.value = p.id
  try {
    await admin.peminjaman.approve(p.id)
    await load()
  } catch {
    alert('Gagal menyetujui.')
  } finally {
    actionId.value = null
  }
}

async function reject(p: Peminjaman) {
  actionId.value = p.id
  try {
    await admin.peminjaman.reject(p.id)
    await load()
  } catch {
    alert('Gagal menolak.')
  } finally {
    actionId.value = null
  }
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Approval Peminjaman</h2>
      <p class="text-sm text-gray-500 mt-1">Setujui atau tolak peminjaman barang proli.</p>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="p in pending" :key="p.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <ClipboardCheck class="w-5 h-5 text-blue-600" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">Peminjam: {{ p.peminjam?.name ?? 'User' }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 shrink-0">menunggu</span>
        </div>

        <div class="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Tanggal: <b class="text-gray-700">{{ fmt(p.tanggal_pinjam) }}</b></span>
          <span>Jam: <b class="text-gray-700">ke-{{ p.jam_mulai }} – {{ p.jam_selesai }}</b></span>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
            :disabled="actionId === p.id"
            @click="approve(p)"
          >
            <Loader2 v-if="actionId === p.id" class="w-3.5 h-3.5 animate-spin" />
            <CheckCircle2 v-else class="w-3.5 h-3.5" />
            Setujui
          </button>
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-medium hover:bg-rose-50 transition disabled:opacity-60"
            :disabled="actionId === p.id"
            @click="reject(p)"
          >
            <XCircle class="w-3.5 h-3.5" />
            Tolak
          </button>
        </div>
      </div>

      <div v-if="!pending.length && !loading" class="md:col-span-2 py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">Tidak ada peminjaman yang menunggu persetujuan.</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
