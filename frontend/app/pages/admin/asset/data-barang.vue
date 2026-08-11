<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import {
  Boxes,
  Plus,
  Search,
  QrCode,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  FolderTree,
  Download
} from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'
import Pagination from '~/components/pagination.vue'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Data Barang' })

const admin = useAdminService()

const items = ref<Barang[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const search = ref('')
const showForm = ref(false)
const editingId = ref<number | null>(null)

// ---- Filter: Owner (Semua/Sarpras/Proli) → Proli ----
const filterOwner = ref<'all' | 'sarpras' | 'proli'>('all')
const filterProli = ref('')
const filterProliOptions = ref<Opt[]>([])

const form = ref({
  nama: '',
  deskripsi: '',
  owner_type: 'sarpras' as 'sarpras' | 'proli',
  kategori_id: '',
  ruangan_id: '',
  proli_id: '',
  satuan_id: '',
  kondisi_id: '',
  sumber_dana_id: '',
  bisa_dipinjam: true
})

interface Opt {
  value: number
  label: string
}

const optionState = ref({
  kategori: [] as Opt[],
  ruangan: [] as Opt[],
  proli: [] as Opt[],
  satuan: [] as Opt[],
  kondisi: [] as Opt[],
  sumberDana: [] as Opt[]
})

async function loadOptions() {
  const [k, r, p, s, kd, sd] = await Promise.all([
    admin.master.list('kategori-barang', { per_page: 100 }),
    admin.master.list('ruangan', { per_page: 100 }),
    admin.master.list('proli', { per_page: 100 }),
    admin.master.list('satuan', { per_page: 100 }),
    admin.master.list('kondisi-barang', { per_page: 100 }),
    admin.master.list('sumber-dana', { per_page: 100 })
  ])
  optionState.value.kategori = k.data.map((x: any) => ({ value: x.id, label: x.nama }))
  optionState.value.ruangan = r.data.map((x: any) => ({ value: x.id, label: x.nama }))
  optionState.value.proli = p.data.map((x: any) => ({ value: x.id, label: x.nama }))
  optionState.value.satuan = s.data.map((x: any) => ({ value: x.id, label: x.nama }))
  optionState.value.kondisi = kd.data.map((x: any) => ({ value: x.id, label: x.nama }))
  optionState.value.sumberDana = sd.data.map((x: any) => ({ value: x.id, label: x.nama }))
  filterProliOptions.value = p.data.map((x: any) => ({ value: x.id, label: x.nama }))
}

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((b) => {
    const matchQ = !q || b.nama.toLowerCase().includes(q) || (b.kode_qr ?? '').toLowerCase().includes(q)
    const matchOwner = filterOwner.value === 'all' || b.owner_type === filterOwner.value
    const matchProli = !filterProli.value || b.proli_id === Number(filterProli.value)
    return matchQ && matchOwner && matchProli
  })
})

// Kelompokkan barang per jurusan (proli); barang sarpras masuk grup "Sarpras"
const groups = computed(() => {
  const map = new Map<string, Barang[]>()
  for (const b of filtered.value) {
    const key = b.owner_type === 'proli' ? (b.proli?.nama ?? 'Proli') : 'Sarpras'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(b)
  }
  const result: { label: string; proli?: string; items: Barang[] }[] = []
  for (const [label, list] of map) {
    result.push({ label, items: list })
  }
  result.sort((a, b) => a.label.localeCompare(b.label))
  return result
})

const totalShown = computed(() => filtered.value.length)

// ---- Pagination: ratakan (header grup + barang) jadi baris, 20 baris per halaman ----
type FlatRow =
  | { kind: 'group'; label: string; proli?: string; count: number }
  | { kind: 'item'; item: Barang }

const page = ref(1)
const PER_PAGE = 20

const flatRows = computed<FlatRow[]>(() => {
  const out: FlatRow[] = []
  for (const g of groups.value) {
    out.push({ kind: 'group', label: g.label, proli: g.proli, count: g.items.length })
    for (const b of g.items) out.push({ kind: 'item', item: b })
  }
  return out
})

const pagedRows = computed<FlatRow[]>(() =>
  flatRows.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

// Reset ke halaman pertama saat pencarian/filter berubah
watch(filtered, () => {
  page.value = 1
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.barang.list({ per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data barang.'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!form.value.nama.trim()) return
  saving.value = true
  error.value = null
  try {
    const isProli = form.value.owner_type === 'proli'
    const payload = {
      nama: form.value.nama,
      deskripsi: form.value.deskripsi || null,
      owner_type: form.value.owner_type,
      kategori_id: form.value.kategori_id ? Number(form.value.kategori_id) : null,
      // Proli hanya relevan untuk barang milik proli — kosongkan saat
      // owner sarpras agar tidak tersisa nilai lama ketika berpindah dari proli ke sarpras.
      proli_id: isProli && form.value.proli_id ? Number(form.value.proli_id) : null,
      ruangan_id: form.value.ruangan_id ? Number(form.value.ruangan_id) : null,
      satuan_id: form.value.satuan_id ? Number(form.value.satuan_id) : null,
      kondisi_id: form.value.kondisi_id ? Number(form.value.kondisi_id) : null,
      sumber_dana_id: form.value.sumber_dana_id ? Number(form.value.sumber_dana_id) : null,
      bisa_dipinjam: form.value.bisa_dipinjam
    }
    if (editingId.value) {
      await admin.barang.update(editingId.value, payload)
    } else {
      await admin.barang.create(payload)
    }
    closeForm()
    await load()
  } catch (e: any) {
    const err = e?.data?.errors
    error.value = err?.nama?.[0] ?? e?.data?.message ?? 'Gagal menyimpan barang.'
  } finally {
    saving.value = false
  }
}

function openForm(b?: Barang) {
  editingId.value = b?.id ?? null
  form.value.nama = b?.nama ?? ''
  form.value.deskripsi = b?.deskripsi ?? ''
  form.value.owner_type = b?.owner_type ?? 'sarpras'
  form.value.kategori_id = b?.kategori_id != null ? String(b.kategori_id) : ''
  form.value.ruangan_id = b?.ruangan_id != null ? String(b.ruangan_id) : ''
  form.value.proli_id = b?.proli_id != null ? String(b.proli_id) : ''
  form.value.satuan_id = b?.satuan_id != null ? String(b.satuan_id) : ''
  form.value.kondisi_id = b?.kondisi_id != null ? String(b.kondisi_id) : ''
  form.value.sumber_dana_id = b?.sumber_dana_id != null ? String(b.sumber_dana_id) : ''
  form.value.bisa_dipinjam = b?.bisa_dipinjam !== false
  showForm.value = true
  error.value = null
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  form.value.nama = ''
  form.value.deskripsi = ''
  form.value.owner_type = 'sarpras'
  form.value.kategori_id = ''
  form.value.ruangan_id = ''
  form.value.proli_id = ''
  form.value.satuan_id = ''
  form.value.kondisi_id = ''
  form.value.sumber_dana_id = ''
  form.value.bisa_dipinjam = true
}

async function remove(id: number) {
  if (!confirm('Yakin ingin menghapus barang ini?')) return
  try {
    await admin.barang.remove(id)
    await load()
  } catch {
    alert('Gagal menghapus barang.')
  }
}

// Export CSV seluruh barang — dikelompokkan per jurusan (Sarpras / nama proli)
function exportCSV() {
  const rows: string[][] = [
    ['Nama Barang', 'Kode QR', 'Jurusan', 'Kategori', 'Ruangan', 'Status']
  ]
  for (const g of groups.value) {
    rows.push([`=== ${g.label} ===`, '', '', '', '', ''])
    for (const b of g.items) {
      rows.push([
        b.nama,
        b.kode_qr ?? '',
        b.owner_type === 'proli' ? (b.proli?.nama ?? 'Proli') : 'Sarpras',
        b.kategori?.nama ?? '',
        b.ruangan?.nama ?? '',
        b.status
      ])
    }
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `data-barang-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    aktif: 'bg-emerald-50 text-emerald-700',
    rusak: 'bg-rose-50 text-rose-700',
    dipinjam: 'bg-red-50 text-red-700',
    maintenance: 'bg-amber-50 text-amber-700'
  }
  return map[s] ?? 'bg-gray-50 text-gray-700'
}

const route = useRoute()

// Menu "Tambah Barang" di sidebar → buka form langsung (?tambah=1);
// kembali ke "Semua Barang" (query dihapus) → tutup form baru.
watch(
  () => route.query.tambah,
  (v) => {
    if (v === '1' && !showForm.value) {
      openForm()
    } else if (v !== '1' && showForm.value && !editingId.value) {
      closeForm()
    }
  },
  { immediate: true }
)

onMounted(() => {
  load()
  loadOptions()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header + actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Data Barang</h2>
        <p class="text-sm text-gray-500 mt-1">Kelola seluruh aset barang sekolah, dikelompokkan per jurusan (proli).</p>
      </div>
      <div class="flex gap-2">
        <button
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition w-fit"
          @click="exportCSV"
        >
          <Download class="w-4 h-4" />
          Export CSV
        </button>
        <button
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition shadow-sm"
          @click="openForm()"
        >
          <Plus class="w-4 h-4" />
          Tambah Barang
        </button>
      </div>
    </div>

    <!-- Add form -->
    <div v-if="showForm" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 class="font-semibold text-gray-900 mb-4">{{ editingId ? 'Edit Barang' : 'Tambah Barang Baru' }}</h3>
      <form class="grid sm:grid-cols-2 gap-4" @submit.prevent="submit">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Nama Barang</label>
          <input
            v-model="form.nama"
            required
            placeholder="Contoh: Proyektor Epson EB-X51"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi Barang (tampil saat scan QR)</label>
          <textarea
            v-model="form.deskripsi"
            rows="3"
            placeholder="Contoh: Proyektor LCD 3LCD 3600 lumen untuk presentasi dan media pembelajaran…"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Owner</label>
          <select v-model="form.owner_type" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500">
            <option value="sarpras">Sarpras</option>
            <option value="proli">Proli</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
          <select v-model="form.kategori_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="">— Pilih —</option>
            <option v-for="o in optionState.kategori" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ruangan</label>
          <select v-model="form.ruangan_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="">— Pilih —</option>
            <option v-for="o in optionState.ruangan" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Satuan</label>
          <select v-model="form.satuan_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="">— Pilih —</option>
            <option v-for="o in optionState.satuan" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Kondisi Barang</label>
          <select v-model="form.kondisi_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="">— Pilih —</option>
            <option v-for="o in optionState.kondisi" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Sumber Dana</label>
          <select v-model="form.sumber_dana_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="">— Pilih —</option>
            <option v-for="o in optionState.sumberDana" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div v-if="form.owner_type === 'proli'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Proli</label>
          <select v-model="form.proli_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white">
            <option value="">— Pilih —</option>
            <option v-for="o in optionState.proli" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="flex items-center gap-2.5 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition">
            <input
              v-model="form.bisa_dipinjam"
              type="checkbox"
              class="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span class="text-sm text-gray-700">
              Bisa dipinjam
              <span class="block text-xs text-gray-400">
                Matikan untuk aset yang tidak dipinjamkan (mis. pintu, jendela, aset bangunan) — tetap bisa lapor rusak & maintenance.
              </span>
            </span>
          </label>
        </div>
        <div class="sm:col-span-2 flex gap-3 pt-2">
          <button
            type="submit"
            :disabled="saving"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            {{ saving ? 'Menyimpan…' : 'Simpan' }}
          </button>
          <button type="button" class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50" @click="closeForm">
            Batal
          </button>
        </div>
      </form>
      <p v-if="error" class="mt-3 text-sm text-rose-600">{{ error }}</p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col lg:flex-row gap-3 lg:items-center">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Cari nama atau kode QR…"
          class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <!-- Pilihan Owner: Semua / Sarpras / Proli -->
        <button
          v-for="o in ([{v:'all',l:'Semua'},{v:'sarpras',l:'Sarpras'},{v:'proli',l:'Proli'}] as const)"
          :key="o.v"
          class="px-3 py-2 rounded-xl text-sm font-medium border transition"
          :class="filterOwner === o.v ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          @click="filterOwner = o.v"
        >
          {{ o.l }}
        </button>

        <!-- Pilihan Proli (muncul saat filter Proli) -->
        <select
          v-if="filterOwner === 'proli'"
          v-model="filterProli"
          class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-red-500 bg-white"
          title="Filter proli"
        >
          <option value="">Semua Proli</option>
          <option v-for="o in filterProliOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>

        <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50" title="Muat ulang" @click="load">
          <RefreshCw class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Info jumlah -->
    <p class="text-xs text-gray-400">
      Menampilkan {{ totalShown }} barang{{ filterOwner === 'proli' && filterProli ? ' dari proli ' + (filterProliOptions.find((o) => o.value === Number(filterProli))?.label ?? '') : filterOwner === 'proli' ? ' dari proli' : filterOwner === 'sarpras' ? ' milik sarpras' : '' }}.
    </p>

    <!-- Table (dikelompokkan per jurusan/proli) -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Nama Barang</th>
              <th class="px-5 py-3">Kode QR</th>
              <th class="px-5 py-3">Jurusan</th>
              <th class="px-5 py-3">Kategori</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <!-- Baris header grup per jurusan (proli) -->
            <template v-for="row in pagedRows" :key="row.kind === 'group' ? 'group-' + row.label : row.item.id">
              <tr v-if="row.kind === 'group'" class="bg-red-50/60">
                <td colspan="6" class="px-5 py-2.5">
                  <div class="flex items-center gap-2">
                    <FolderTree class="w-4 h-4 text-red-600 shrink-0" />
                    <span class="font-semibold text-red-900">{{ row.label }}</span>
                    <span v-if="row.label !== 'Sarpras'" class="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded">Proli</span>
                    <span class="text-xs text-gray-400">({{ row.count }})</span>
                  </div>
                </td>
              </tr>
              <tr v-else :key="row.item.id" class="hover:bg-gray-50/50 transition">
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                      <Boxes class="w-4 h-4 text-red-600" />
                    </div>
                    <div class="font-medium text-gray-900">{{ row.item.nama }}</div>
                  </div>
                </td>
                <td class="px-5 py-3.5">
                  <span class="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600">
                    <QrCode class="w-3.5 h-3.5 text-gray-400" />
                    {{ row.item.kode_qr }}
                  </span>
                </td>
                <td class="px-5 py-3.5">
                  <span class="text-xs px-2 py-1 rounded" :class="row.item.owner_type === 'sarpras' ? 'bg-red-50 text-red-700' : 'bg-violet-50 text-violet-700'">
                    {{ row.item.owner_type === 'proli' ? (row.item.proli?.nama ?? 'Proli') : 'Sarpras' }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-xs text-gray-600">
                  {{ row.item.kategori?.nama ?? 'Tanpa kategori' }}
                </td>
                <td class="px-5 py-3.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-xs px-2 py-1 rounded" :class="statusBadge(row.item.status)">
                      {{ row.item.status }}
                    </span>
                    <span v-if="row.item.bisa_dipinjam === false" class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500" title="Tidak bisa dipinjam">
                      non-pinjam
                    </span>
                  </div>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <button class="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Edit" @click="openForm(row.item)">
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button class="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition ml-1" title="Hapus" @click="remove(row.item.id)">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </template>
            <tr v-if="!filtered.length && !loading">
              <td colspan="6" class="px-5 py-12 text-center text-gray-400">
                <Boxes class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ items.length ? 'Tidak ada barang yang cocok.' : 'Belum ada data barang. Klik "Tambah Barang" untuk memulai.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>

    <!-- Pagination: 20 baris per halaman -->
    <Pagination v-model:page="page" :total="flatRows.length" :per-page="PER_PAGE" label="baris" />
  </div>
</template>
