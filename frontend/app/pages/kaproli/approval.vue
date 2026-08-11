<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { ClipboardCheck, CheckCircle2, XCircle, Inbox, Loader2, PackageCheck } from 'lucide-vue-next'
import { useAdminService, type Peminjaman } from '~/services/api/admin'
import { fmtJam } from '~/utils/format'
import SlotJamIndicator from '~/components/ui/slot-jam-indicator.vue'
import Pagination from '~/components/ui/pagination.vue'

definePageMeta({ layout: 'staff', middleware: ['auth', 'kaproli'], title: 'Approval' })

const admin = useAdminService()

const items = ref<Peminjaman[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const actionId = ref<number | null>(null)

const pending = computed(() => items.value.filter((p) => p.status === 'menunggu'))

// Kelompokkan item paket (kelompok_id sama) agar tampil sebagai satu pengajuan.
// Item tanpa kelompok_id tetap berdiri sendiri.
const groupedPending = computed(() => {
  const map = new Map<string, any[]>()
  for (const p of pending.value) {
    if (p.kelompok_id) {
      const arr = map.get(p.kelompok_id) ?? []
      arr.push(p)
      map.set(p.kelompok_id, arr)
    }
  }
  const result: { isPaket: boolean; items: any[] }[] = []
  const seen = new Set<string>()
  for (const p of pending.value) {
    if (p.kelompok_id) {
      if (seen.has(p.kelompok_id)) continue
      seen.add(p.kelompok_id)
      result.push({ isPaket: true, items: (map.get(p.kelompok_id) ?? []).sort((a, b) => a.id - b.id) })
    } else {
      result.push({ isPaket: false, items: [p] })
    }
  }
  return result
})

// ---- Pagination: 20 data per halaman ----
const page = ref(1)
const PER_PAGE = 20

const pagedPending = computed(() =>
  groupedPending.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

watch(groupedPending, () => {
  page.value = 1
})

const jenisBadge = (j?: string) =>
  j === 'eskul'
    ? { label: 'Eskul / Kegiatan', cls: 'bg-violet-50 text-violet-700' }
    : { label: 'Pembelajaran', cls: 'bg-blue-50 text-blue-700' }

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
  } catch (e: any) {
    // Tampilkan alasan dari server (mis. barang sedang rusak/maintenance).
    alert(e?.data?.message ?? 'Gagal menyetujui.')
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
      <h2 class="text-sm font-bold text-gray-900">Approval Peminjaman</h2>
      <p class="text-sm text-gray-500 mt-1">Setujui atau tolak peminjaman barang proli.</p>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid md:grid-cols-2 gap-4">
      <div
        v-for="g in pagedPending"
        :key="g.isPaket ? g.items[0].kelompok_id : g.items[0].id"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition"
      >
        <div class="p-5 pb-2 flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <ClipboardCheck class="w-5 h-5 text-blue-600" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span
                v-if="g.isPaket"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-2xs font-semibold"
              >
                <PackageCheck class="w-3 h-3" />
                Paket {{ g.items.length }} barang
              </span>
              <span class="text-2xs px-2 py-0.5 rounded font-semibold" :class="jenisBadge(g.items[0].jenis).cls">
                {{ jenisBadge(g.items[0].jenis).label }}
              </span>
            </div>
            <div class="font-semibold text-gray-900 mt-0.5 truncate">Peminjam: {{ g.items[0].peminjam?.name ?? 'User' }}</div>
            <div class="text-xs text-gray-400 mt-0.5">
              {{ fmt(g.items[0].tanggal_pinjam) }} • {{ fmtJam(g.items[0].jam_mulai) }} – {{ fmtJam(g.items[0].jam_selesai) }}
            </div>
            <div v-if="g.items[0].penanggung_jawab" class="text-xs text-gray-500 mt-0.5">
              PJ: {{ g.items[0].penanggung_jawab }}
            </div>
          </div>
          <span class="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 shrink-0">menunggu</span>
        </div>

        <!-- Daftar barang dalam pengajuan -->
        <div class="px-5 pb-3 space-y-2">
          <div v-for="p in g.items" :key="p.id" class="rounded-xl border border-gray-100 bg-gray-50/40 p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm font-semibold text-gray-900 truncate">{{ p.barang?.nama ?? 'Barang #' + p.barang_id }}</div>
                <div class="text-xs text-gray-400 mt-0.5">{{ p.barang?.kode_qr ?? '' }}</div>
              </div>
              <span class="text-2xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 shrink-0">menunggu</span>
            </div>

            <!-- Indikator visual slot jam: merah = jam dipesan, hijau = jam tersedia -->
            <SlotJamIndicator :jam-mulai="p.jam_mulai" :jam-selesai="p.jam_selesai" />

            <div class="mt-3 flex items-center gap-2">
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
        </div>
      </div>

      <div v-if="!pending.length && !loading" class="md:col-span-2 py-12 text-center">
        <Inbox class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">Tidak ada peminjaman yang menunggu persetujuan.</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>

    <!-- Pagination: 20 data per halaman -->
    <Pagination v-model:page="page" :total="pending.length" :per-page="PER_PAGE" label="peminjaman" />
  </div>
</template>
