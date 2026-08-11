<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { Wrench, CheckCircle2, Play, RefreshCw, Inbox, X, Camera, Loader2, Receipt } from 'lucide-vue-next'
import { useAdminService, type Maintenance } from '~/services/api/admin'
import { formatRupiah } from '~/utils/format'
import Pagination from '~/components/pagination.vue'

definePageMeta({ layout: 'staff', middleware: ['auth', 'staff'], title: 'Maintenance' })

const admin = useAdminService()
const authStore = useAuthStore()

const items = ref<Maintenance[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const actionId = ref<number | null>(null)

// Modal selesai: biaya + foto resi
const showComplete = ref(false)
const completeTarget = ref<Maintenance | null>(null)
const completeBiaya = ref('')
const completeResi = ref('')
const completeError = ref<string | null>(null)
const completeSaving = ref(false)
const resiInput = ref<HTMLInputElement | null>(null)
const resiUploading = ref(false)

// Jadwal yang ditugaskan ke staff ini
const myMaintenance = computed(() =>
  items.value.filter((m) => m.staff_id === authStore.user?.id && m.status !== 'selesai')
)

// ---- Pagination: 20 jadwal per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedMaintenance = computed(() =>
  myMaintenance.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(myMaintenance, () => {
  page.value = 1
})

const badge = (s: string) => {
  const map: Record<string, string> = {
    terjadwal: 'bg-amber-50 text-amber-700',
    berlangsung: 'bg-blue-50 text-blue-700',
    selesai: 'bg-emerald-50 text-emerald-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
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

async function changeStatus(m: Maintenance, status: 'berlangsung') {
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

function openComplete(m: Maintenance) {
  completeTarget.value = m
  completeBiaya.value = m.biaya ? String(m.biaya) : ''
  completeResi.value = m.resi_url ?? ''
  completeError.value = null
  showComplete.value = true
}

function pickResi() {
  resiInput.value?.click()
}

async function onResiChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    completeError.value = 'File harus berupa gambar.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    completeError.value = 'Ukuran foto maksimal 5MB.'
    return
  }
  resiUploading.value = true
  completeError.value = null
  try {
    const res = await admin.upload(file)
    completeResi.value = res.url
  } catch (e: any) {
    completeError.value = e?.data?.message ?? 'Gagal mengunggah foto resi.'
  } finally {
    resiUploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function confirmComplete() {
  if (!completeTarget.value) return
  if (Number(completeBiaya.value) > 0 && !completeResi.value) {
    completeError.value = 'Foto resi wajib diunggah jika ada biaya pengeluaran.'
    return
  }
  completeSaving.value = true
  completeError.value = null
  try {
    await admin.maintenance.update(completeTarget.value.id, {
      status: 'selesai',
      biaya: completeBiaya.value ? Number(completeBiaya.value) : null,
      resi_url: completeResi.value || null
    })
    showComplete.value = false
    await load()
  } catch (e: any) {
    completeError.value = e?.data?.message ?? 'Gagal menyelesaikan maintenance.'
  } finally {
    completeSaving.value = false
  }
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Maintenance</h2>
        <p class="text-sm text-gray-500 mt-1">Jadwal maintenance yang ditugaskan kepada Anda.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="m in pagedMaintenance" :key="m.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
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
          <span class="text-xs px-2 py-1 rounded shrink-0" :class="badge(m.status)">{{ m.status }}</span>
        </div>

        <p v-if="m.catatan" class="mt-3 text-sm text-gray-600 line-clamp-2">{{ m.catatan }}</p>

        <div v-if="m.biaya || m.resi_url" class="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
          <span v-if="m.biaya" class="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <Receipt class="w-4 h-4" />
            {{ formatRupiah(m.biaya) }}
          </span>
          <button
            v-if="m.resi_url"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
            @click="m.showResi = !m.showResi"
          >
            <Camera class="w-3.5 h-3.5" />
            {{ m.showResi ? 'Sembunyikan resi' : 'Lihat foto resi' }}
          </button>
          <img
            v-if="m.showResi && m.resi_url"
            :src="m.resi_url"
            class="w-full max-h-44 rounded-lg object-cover border border-emerald-100"
            alt="Foto resi pengeluaran"
          />
        </div>

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
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
            @click="openComplete(m)"
          >
            <CheckCircle2 class="w-3.5 h-3.5" />
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

    <!-- Pagination: 20 jadwal per halaman -->
    <Pagination v-model:page="page" :total="myMaintenance.length" :per-page="PER_PAGE" label="jadwal" />

    <!-- Modal selesaikan: biaya + foto resi -->
    <div v-if="showComplete && completeTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="!completeSaving && (showComplete = false)" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-900">Selesaikan Maintenance</h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" :disabled="completeSaving" @click="showComplete = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <p class="text-sm text-gray-600 mb-1">Barang: <b>{{ completeTarget.barang?.nama }}</b></p>
        <p class="text-xs text-gray-400 mb-4">Tanggal {{ fmt(completeTarget.tanggal_jadwal) }}</p>

        <label class="block text-sm font-medium text-gray-700 mb-1">Biaya Pengeluaran</label>
        <div class="relative mb-4">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
          <input
            v-model="completeBiaya"
            type="number"
            min="0"
            placeholder="0"
            class="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label class="block text-sm font-medium text-gray-700 mb-1">Foto Resi <span v-if="Number(completeBiaya) > 0" class="text-rose-500">*</span></label>
        <div
          class="relative rounded-xl border-2 border-dashed p-3 text-center transition cursor-pointer"
          :class="completeResi ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'"
          @click="pickResi"
        >
          <img v-if="completeResi" :src="completeResi" class="max-h-40 mx-auto rounded-lg object-cover" alt="Foto resi" />
          <div v-else class="py-4">
            <Camera v-if="!resiUploading" class="w-6 h-6 mx-auto mb-1 text-gray-400" />
            <Loader2 v-else class="w-6 h-6 mx-auto mb-1 text-emerald-500 animate-spin" />
            <p class="text-xs text-gray-500">{{ resiUploading ? 'Mengunggah…' : 'Foto struk/resi pengeluaran (maks 5MB)' }}</p>
          </div>
        </div>
        <input ref="resiInput" type="file" accept="image/*" class="hidden" :disabled="resiUploading" @change="onResiChange" />

        <p v-if="completeError" class="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{{ completeError }}</p>

        <div class="mt-5 flex justify-end gap-3">
          <button class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50" :disabled="completeSaving" @click="showComplete = false">
            Batal
          </button>
          <button
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60"
            :disabled="completeSaving"
            @click="confirmComplete"
          >
            <Loader2 v-if="completeSaving" class="w-4 h-4 animate-spin" />
            <CheckCircle2 v-else class="w-4 h-4" />
            {{ completeSaving ? 'Menyimpan…' : 'Selesaikan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
