<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  CalendarClock,
  Plus,
  Timer,
  Clock,
  Boxes,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-vue-next'
import { useAdminService, type Barang, type BarangJadwal, HARI_LABEL } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Jadwal Booking Barang' })

const admin = useAdminService()

// ============================================================
// Form "Atur Jadwal Booking"
// ============================================================
const barangOptions = ref<Barang[]>([])
const selectedBarang = ref<number | ''>('')
const jamMulai = ref('07:00')
const jamAkhir = ref('15:00')
const durasi = ref(60)
const durasiOptions = [30, 45, 60, 90, 120]

const loadingBarang = ref(false)
const saving = ref(false)
const toast = ref<{ type: 'ok' | 'err'; msg: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function flash(type: 'ok' | 'err', msg: string) {
  toast.value = { type, msg }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), 3500)
}

// ============================================================
// Data slot
// ============================================================
const slots = ref<BarangJadwal[]>([])

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'istirahat', label: 'Istirahat' },
  { value: 'tidak_tersedia', label: 'Tidak Tersedia' },
  { value: 'booked', label: 'Booked' }
]

const statusStyle: Record<string, string> = {
  available: 'text-emerald-600 font-medium',
  istirahat: 'text-amber-600 font-medium',
  tidak_tersedia: 'text-gray-400',
  booked: 'text-red-600 font-medium'
}

const statusDot: Record<string, string> = {
  available: 'bg-emerald-500',
  istirahat: 'bg-amber-500',
  tidak_tersedia: 'bg-gray-300',
  booked: 'bg-red-500'
}

// Baris tabel = kombinasi (jam_mulai, jam_selesai) unik yang ada di jadwal.
type RowKey = string
const rows = computed(() => {
  const map = new Map<RowKey, { start: string; end: string }>()
  for (const s of slots.value) {
    map.set(`${s.jam_mulai}|${s.jam_selesai}`, { start: s.jam_mulai, end: s.jam_selesai })
  }
  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start))
})

function slotAt(row: { start: string; end: string }, hari: number) {
  return slots.value.find(
    (s) => s.hari === hari && s.jam_mulai === row.start && s.jam_selesai === row.end
  )
}

// ============================================================
// Muat data
// ============================================================
async function loadBarangs() {
  loadingBarang.value = true
  try {
    const res = await admin.barang.list({ per_page: 100 })
    barangOptions.value = res.data
  } catch (e: any) {
    flash('err', e?.data?.message ?? 'Gagal memuat daftar barang.')
  } finally {
    loadingBarang.value = false
  }
}

async function loadJadwal() {
  slots.value = []
  if (!selectedBarang.value) return
  try {
    slots.value = await admin.barangJadwal.list({ barang_id: selectedBarang.value })
  } catch (e: any) {
    flash('err', e?.data?.message ?? 'Gagal memuat jadwal barang.')
  }
}

watch(selectedBarang, loadJadwal)

// ============================================================
// Atur Tabel: bangkitkan slot dari jam mulai/akhir/durasi
// ============================================================
function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}
function toHHMM(mins: number) {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

async function aturTabel() {
  if (!selectedBarang.value) {
    flash('err', 'Pilih barang terlebih dahulu.')
    return
  }
  const start = toMinutes(jamMulai.value)
  const end = toMinutes(jamAkhir.value)
  const d = durasi.value
  if (!(d > 0 && end > start)) {
    flash('err', 'Jam akhir harus lebih besar dari jam mulai.')
    return
  }
  if (slots.value.length && !confirm('Atur Tabel akan mengganti seluruh jadwal yang ada saat ini. Lanjutkan?')) {
    return
  }

  const generated: Partial<BarangJadwal>[] = []
  for (let hari = 1; hari <= 7; hari++) {
    for (let t = start; t + d <= end; t += d) {
      generated.push({
        hari,
        jam_mulai: toHHMM(t),
        jam_selesai: toHHMM(t + d),
        status: 'available'
      })
    }
  }

  saving.value = true
  try {
    slots.value = await admin.barangJadwal.store({ barang_id: selectedBarang.value, slots: generated })
    flash('ok', `Jadwal tersimpan: ${rows.value.length} slot × 7 hari.`)
  } catch (e: any) {
    flash('err', e?.data?.message ?? 'Gagal menyimpan jadwal.')
  } finally {
    saving.value = false
  }
}

async function updateSlot(slot: BarangJadwal, status: string) {
  const sebelum = slot.status
  slot.status = status as BarangJadwal['status']
  try {
    const updated = await admin.barangJadwal.update(slot.id, { status: status as BarangJadwal['status'] })
    slot.status = updated.status
  } catch {
    slot.status = sebelum
    flash('err', 'Gagal mengubah status slot.')
  }
}

async function hapusSemua() {
  if (!selectedBarang.value) return
  if (!confirm('Hapus seluruh jadwal booking barang ini?')) return
  saving.value = true
  try {
    await admin.barangJadwal.store({ barang_id: selectedBarang.value, slots: [] })
    slots.value = []
    flash('ok', 'Seluruh jadwal barang dihapus.')
  } catch (e: any) {
    flash('err', e?.data?.message ?? 'Gagal menghapus jadwal.')
  } finally {
    saving.value = false
  }
}

const barangAktifLabel = computed(
  () => barangOptions.value.find((b) => b.id === selectedBarang.value)?.nama ?? '-'
)

onMounted(loadBarangs)
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Jadwal Booking Barang</h2>
        <p class="text-sm text-gray-500 mt-1">
          Atur slot waktu peminjaman per barang — jam mulai, jam akhir, durasi slot, dan status tiap hari.
        </p>
      </div>
      <div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-100 shadow-sm text-sm text-gray-600">
        <CalendarClock class="w-4 h-4 text-red-600" />
        Booking Barang
      </div>
    </div>

    <!-- Toast -->
    <div
      v-if="toast"
      class="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition"
      :class="toast.type === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'"
    >
      <CheckCircle2 v-if="toast.type === 'ok'" class="w-4 h-4 shrink-0" />
      <AlertTriangle v-else class="w-4 h-4 shrink-0" />
      {{ toast.msg }}
    </div>

    <!-- Panel: Atur Jadwal Booking -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 class="text-sm font-semibold text-gray-800 mb-4">Atur Jadwal Dan Booking</h3>

      <div class="flex flex-col xl:flex-row xl:items-end gap-4">
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          <!-- Barang -->
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Pilih Barang</label>
            <div class="relative">
              <Boxes class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" />
              <select
                v-model="selectedBarang"
                class="w-full appearance-none rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white disabled:opacity-60"
                :disabled="loadingBarang"
              >
                <option value="" disabled>— Pilih Barang —</option>
                <option v-for="b in barangOptions" :key="b.id" :value="b.id">
                  {{ b.nama }} ({{ b.kode_qr }})
                </option>
              </select>
            </div>
          </div>

          <!-- Jam Mulai -->
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Jam Mulai</label>
            <div class="relative">
              <Clock class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
              <input
                v-model="jamMulai"
                type="time"
                class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <!-- Jam Akhir -->
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Jam Akhir</label>
            <div class="relative">
              <Clock class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
              <input
                v-model="jamAkhir"
                type="time"
                class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <!-- Durasi Slot -->
          <div>
            <label class="text-xs font-medium text-gray-500 mb-1 block">Durasi Slot</label>
            <div class="relative">
              <Timer class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
              <select
                v-model.number="durasi"
                class="w-full appearance-none rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option v-for="d in durasiOptions" :key="d" :value="d">{{ d }} Menit</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-600 text-sm font-semibold hover:bg-emerald-50 transition disabled:opacity-60"
            :disabled="saving || !selectedBarang"
            @click="aturTabel"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            <Plus v-else class="w-4 h-4" />
            Atur Tabel
          </button>
          <button
            class="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-rose-200 text-rose-600 text-sm font-medium hover:bg-rose-50 transition disabled:opacity-60"
            :disabled="saving || !selectedBarang || !slots.length"
            @click="hapusSemua"
          >
            <Trash2 class="w-4 h-4" />
            Hapus Jadwal
          </button>
        </div>
      </div>

      <p class="mt-3 text-xs text-gray-400">
        Klik <b>Atur Tabel</b> untuk membangkitkan slot dari jam mulai s/d jam akhir pada seluruh hari (Senin–Minggu),
        lalu ubah status tiap slot sesuai kebutuhan.
      </p>
    </div>

    <!-- Tabel jadwal -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="flex items-center justify-between px-5 pt-4">
        <div class="text-sm text-gray-500">
          Jadwal untuk <span class="font-semibold text-gray-800">{{ barangAktifLabel }}</span>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="slots.length" class="flex items-center gap-3 text-2xs text-gray-400">
            <span v-for="opt in statusOptions" :key="opt.value" class="inline-flex items-center gap-1">
              <span class="w-2 h-2 rounded-full" :class="statusDot[opt.value]" />
              {{ opt.label }}
            </span>
          </div>
          <button
            class="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition disabled:opacity-50"
            :disabled="!selectedBarang"
            @click="loadJadwal"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            Muat ulang
          </button>
        </div>
      </div>

      <div class="overflow-x-auto mt-3">
        <table class="w-full text-sm min-w-[900px]">
          <thead>
            <tr class="bg-gray-50 text-gray-500">
              <th class="px-4 py-3 text-left font-medium w-12">No</th>
              <th class="px-4 py-3 text-left font-medium w-36">Waktu</th>
              <th v-for="(label, i) in HARI_LABEL" :key="i" class="px-4 py-3 text-center font-medium min-w-[120px]">
                {{ label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!selectedBarang">
              <td colspan="9" class="px-4 py-10 text-center text-gray-400 text-sm">
                Pilih barang untuk melihat atau mengatur jadwal booking.
              </td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td colspan="9" class="px-4 py-10 text-center text-gray-400 text-sm">
                Belum ada slot — atur jam mulai, jam akhir, dan durasi lalu klik "Atur Tabel".
              </td>
            </tr>
            <tr v-for="(row, rIdx) in rows" :key="row.start + row.end" class="border-t border-gray-100">
              <td class="px-4 py-3 text-gray-500">{{ rIdx + 1 }}</td>
              <td class="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{{ row.start }} - {{ row.end }}</td>
              <td v-for="(_, hariIdx) in HARI_LABEL" :key="hariIdx" class="px-3 py-2 text-center">
                <template v-if="slotAt(row, hariIdx + 1)">
                  <div class="relative">
                    <select
                      :value="slotAt(row, hariIdx + 1)!.status"
                      class="w-full appearance-none rounded-lg border border-gray-200 pl-3 pr-7 py-2 text-xs outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      :class="statusStyle[slotAt(row, hariIdx + 1)!.status]"
                      @change="updateSlot(slotAt(row, hariIdx + 1)!, ($event.target as HTMLSelectElement).value)"
                    >
                      <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                </template>
                <span v-else class="text-gray-300">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
