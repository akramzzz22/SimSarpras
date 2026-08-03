<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { AlertTriangle, CheckCircle2, RefreshCw, Inbox, Wrench } from 'lucide-vue-next'
import { useAdminService, type LaporanKerusakan } from '~/services/api/admin'

definePageMeta({ layout: 'staff', middleware: ['auth'], title: 'Laporan Kerusakan' })

const admin = useAdminService()

const items = ref<LaporanKerusakan[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const verifyingId = ref<number | null>(null)

const filtered = computed(() => items.value.filter((l) => l.barang?.owner_type === 'proli' || !l.barang))

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.laporan.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat laporan.'
  } finally {
    loading.value = false
  }
}

async function verifikasi(id: number) {
  verifyingId.value = id
  try {
    await admin.laporan.verifikasi(id, {})
    await load()
  } catch {
    alert('Gagal memverifikasi laporan.')
  } finally {
    verifyingId.value = null
  }
}

const badge = (s: string) => {
  const map: Record<string, string> = {
    menunggu: 'bg-amber-100 text-amber-800',
    diverifikasi: 'bg-blue-100 text-blue-800',
    diperbaiki: 'bg-violet-100 text-violet-800',
    selesai: 'bg-emerald-100 text-emerald-800'
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Laporan Kerusakan</h2>
      <p class="text-sm text-gray-500 mt-1">Laporan kerusakan untuk barang proli.</p>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="l in filtered" :key="l.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <AlertTriangle class="w-5 h-5 text-rose-500" />
            </div>
            <div class="min-w-0">
              <div class="font-semibold text-gray-900 truncate">{{ l.barang?.nama ?? 'Barang #' + l.barang_id }}</div>
              <div class="text-xs text-gray-500 mt-0.5">{{ fmt(l.created_at) }} • oleh {{ l.pelapor?.name ?? 'User' }}</div>
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded-full shrink-0" :class="badge(l.status)">{{ l.status }}</span>
        </div>

        <p class="mt-3 text-sm text-gray-600 line-clamp-2">{{ l.deskripsi }}</p>

        <div class="mt-4">
          <button
            v-if="l.status === 'menunggu'"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            :disabled="verifyingId === l.id"
            @click="verifikasi(l.id)"
          >
            <Wrench v-if="verifyingId !== l.id" class="w-3.5 h-3.5" />
            <CheckCircle2 v-else class="w-3.5 h-3.5 animate-spin" />
            Verifikasi
          </button>
          <span v-else class="text-xs text-gray-400">
            <CheckCircle2 class="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> Ditangani
          </span>
        </div>
      </div>

      <div v-if="!filtered.length && !loading" class="md:col-span-2 py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">Belum ada laporan kerusakan untuk barang proli.</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
