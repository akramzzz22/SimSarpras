<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ChevronLeft, ChevronRight, Wrench, ArrowLeftRight, RefreshCw } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Kalender' })

const admin = useAdminService()

// Bulan yang sedang ditampilkan (awal bulan)
const cursor = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const loading = ref(true)
const error = ref<string | null>(null)

const maintenance = ref<any[]>([])
const peminjaman = ref<any[]>([])

// ---- Navigasi bulan ----
function prevMonth() { cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() - 1, 1) }
function nextMonth() { cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 1) }
function today() { cursor.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1) }

const bulanLabel = computed(() =>
  cursor.value.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
)

// ---- Kisi hari dalam bulan ----
const cells = computed<({ date: Date; inMonth: boolean } | null)[]>(() => {
  const first = cursor.value
  const start = new Date(first.getFullYear(), first.getMonth(), 1)
  const startWeekday = start.getDay() // 0 = Minggu
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const out: ({ date: Date; inMonth: boolean } | null)[] = []
  for (let i = 0; i < startWeekday; i++) out.push(null)
  for (let d = 1; d <= daysInMonth; d++) out.push({ date: new Date(first.getFullYear(), first.getMonth(), d), inMonth: true })
  while (out.length % 7 !== 0) out.push(null)
  return out
})

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

// ---- Event per hari ----
type DayEvent = { jenis: 'maintenance' | 'peminjaman'; id: number; nama: string; sub: string; status: string }
const eventsByDate = computed<Map<string, DayEvent[]>>(() => {
  const map = new Map<string, DayEvent[]>()
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  for (const m of maintenance.value) {
    if (!m.tanggal_jadwal) continue
    map.set(m.tanggal_jadwal, [...(map.get(m.tanggal_jadwal) ?? []), {
      jenis: 'maintenance', id: m.id, nama: m.barang?.nama ?? 'Barang #' + m.barang_id,
      sub: m.staff?.name ?? m.vendor?.nama ?? 'Belum ada PJ', status: m.status
    }])
  }
  for (const p of peminjaman.value) {
    if (!p.tanggal_pinjam) continue
    map.set(p.tanggal_pinjam, [...(map.get(p.tanggal_pinjam) ?? []), {
      jenis: 'peminjaman', id: p.id, nama: p.barang?.nama ?? 'Barang #' + p.barang_id,
      sub: p.peminjam?.name ?? 'User', status: p.status
    }])
  }
  return map
})

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ---- Detail hari terpilih ----
const selectedDate = ref<Date | null>(null)
const selectedEvents = computed(() => {
  if (!selectedDate.value) return []
  return eventsByDate.value.get(dateKey(selectedDate.value)) ?? []
})

function selectDate(d: Date) { selectedDate.value = d }

const isToday = (d: Date) => dateKey(d) === dateKey(new Date())
const isSelected = (d: Date) => !!selectedDate.value && dateKey(d) === dateKey(selectedDate.value)

const badge = (s: string) => ({
  menunggu: 'bg-amber-50 text-amber-700',
  disetujui: 'bg-red-50 text-red-700',
  dipinjam: 'bg-violet-50 text-violet-700',
  dikembalikan: 'bg-emerald-50 text-emerald-700',
  ditolak: 'bg-rose-50 text-rose-700',
  terjadwal: 'bg-amber-50 text-amber-700',
  berlangsung: 'bg-red-50 text-red-700',
  selesai: 'bg-emerald-50 text-emerald-700'
})[s as 'menunggu'] ?? 'bg-gray-50 text-gray-700'

async function load() {
  loading.value = true
  error.value = null
  try {
    const [m, p] = await Promise.all([
      admin.maintenance.list({ per_page: 200 }),
      admin.peminjaman.list({ per_page: 200 })
    ])
    maintenance.value = m.data
    peminjaman.value = p.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data kalender.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Kalender</h2>
        <p class="text-sm text-gray-500 mt-1">Jadwal maintenance dan peminjaman barang per tanggal.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load"><RefreshCw class="w-4 h-4" /></button>
        <div class="flex items-center gap-1 rounded-xl border border-gray-200 p-1">
          <button class="p-1.5 rounded-lg hover:bg-gray-50 text-gray-700 transition" @click="prevMonth"><ChevronLeft class="w-4 h-4" /></button>
          <span class="px-2 text-sm font-semibold text-gray-800 min-w-[130px] text-center">{{ bulanLabel }}</span>
          <button class="p-1.5 rounded-lg hover:bg-gray-50 text-gray-700 transition" @click="nextMonth"><ChevronRight class="w-4 h-4" /></button>
        </div>
        <button class="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition" @click="today">Hari Ini</button>
      </div>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- Legend -->
    <div class="flex flex-wrap items-center gap-4 text-xs text-gray-500">
      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-violet-500" /> Maintenance</span>
      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500" /> Peminjaman</span>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <!-- Header hari -->
      <div class="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
        <div v-for="h in HARI" :key="h" class="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">{{ h }}</div>
      </div>

      <!-- Kisi -->
      <div class="grid grid-cols-7">
        <div
          v-for="(cell, i) in cells"
          :key="i"
          class="min-h-[72px] sm:min-h-[96px] border-b border-r border-gray-50 p-1.5 transition cursor-pointer"
          :class="[
            cell ? 'hover:bg-gray-50' : 'bg-gray-50/50',
            cell && isToday(cell.date) ? 'bg-red-50/40' : '',
            cell && isSelected(cell.date) ? 'bg-red-50' : ''
          ]"
          @click="cell && selectDate(cell.date)"
        >
          <template v-if="cell">
            <div class="text-xs font-medium" :class="isToday(cell.date) ? 'text-red-600 font-bold' : 'text-gray-500'">
              {{ cell.date.getDate() }}
            </div>
            <div class="mt-1 space-y-1">
              <div
                v-for="ev in (eventsByDate.get(dateKey(cell.date)) ?? []).slice(0, 2)"
                :key="ev.jenis + ev.id"
                class="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate"
                :class="ev.jenis === 'maintenance' ? 'bg-violet-50 text-violet-700' : 'bg-red-50 text-red-700'"
                :title="ev.nama + ' — ' + ev.sub"
              >
                <Wrench v-if="ev.jenis === 'maintenance'" class="w-2.5 h-2.5 shrink-0" />
                <ArrowLeftRight v-else class="w-2.5 h-2.5 shrink-0" />
                {{ ev.nama }}
              </div>
              <div v-if="(eventsByDate.get(dateKey(cell.date)) ?? []).length > 2" class="text-[10px] text-gray-400 px-1">
                +{{ (eventsByDate.get(dateKey(cell.date)) ?? []).length - 2 }} lagi
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Detail hari terpilih -->
    <div v-if="selectedDate" class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 class="font-semibold text-gray-900">
          {{ selectedDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
        </h3>
        <span class="text-xs text-gray-400">{{ selectedEvents.length }} kegiatan</span>
      </div>
      <div class="divide-y divide-gray-50">
        <div v-for="ev in selectedEvents" :key="ev.jenis + ev.id" class="flex items-center gap-3 px-5 py-3">
          <div class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center" :class="ev.jenis === 'maintenance' ? 'bg-violet-50' : 'bg-red-50'">
            <Wrench v-if="ev.jenis === 'maintenance'" class="w-4 h-4 text-violet-600" />
            <ArrowLeftRight v-else class="w-4 h-4 text-red-600" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-medium text-gray-900 truncate">{{ ev.nama }}</div>
            <div class="text-xs text-gray-400">{{ ev.sub }}</div>
          </div>
          <span class="text-xs px-2 py-1 rounded" :class="badge(ev.status)">{{ ev.status }}</span>
        </div>
        <div v-if="!selectedEvents.length" class="px-5 py-8 text-center text-sm text-gray-400">Tidak ada kegiatan pada tanggal ini.</div>
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
