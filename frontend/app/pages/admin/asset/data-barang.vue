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
  FolderTree
} from 'lucide-vue-next'
import { useAdminService, type Barang } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Data Barang' })

const admin = useAdminService()

const items = ref<Barang[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const search = ref('')
const showForm = ref(false)
const editingId = ref<number | null>(null)

// ---- Filter: Owner (Semua/Sarpras/Proli) → Proli → Subkategori ----
const filterOwner = ref<'all' | 'sarpras' | 'proli'>('all')
const filterProli = ref('')
const filterProliOptions = ref<Opt[]>([])
const filterSubkategori = ref('')
const filterSubkategoriOptions = ref<Opt[]>([])

const form = ref({
  nama: '',
  deskripsi: '',
  owner_type: 'sarpras' as 'sarpras' | 'proli',
  kategori_id: '',
  ruangan_id: '',
  proli_id: '',
  subkategori_id: ''
})

interface Opt {
  value: number
  label: string
}

const optionState = ref({
  kategori: [] as Opt[],
  ruangan: [] as Opt[],
  proli: [] as Opt[],
  subkategori: [] as Opt[]
})

const proliLabel = computed(
  () => optionState.value.proli.find((o) => o.value === Number(form.value.proli_id))?.label ?? ''
)

// Semua subkategori (untuk filter) — milik proli mana pun
const allSubkategori = ref<{ id: number; nama: string; proli_id?: number | null; proli?: { nama: string } | null }[]>([])

async function loadOptions() {
  const [k, r, p, s] = await Promise.all([
    admin.master.list('kategori-barang', { per_page: 100 }),
    admin.master.list('ruangan', { per_page: 100 }),
    admin.master.list('proli', { per_page: 100 }),
    admin.master.list('subkategori', { per_page: 100 })
  ])
  optionState.value.kategori = k.data.map((x: any) => ({ value: x.id, label: x.nama }))
  optionState.value.ruangan = r.data.map((x: any) => ({ value: x.id, label: x.nama }))
  optionState.value.proli = p.data.map((x: any) => ({ value: x.id, label: x.nama }))
  filterProliOptions.value = p.data.map((x: any) => ({ value: x.id, label: x.nama }))
  allSubkategori.value = s.data.map((x: any) => ({
    id: x.id,
    nama: x.nama,
    proli_id: x.proli_id,
    proli: x.proli ?? null
  }))
}

// Muat subkategori milik proli yang dipilih (untuk filter & form)
async function loadFilterSubkategori() {
  filterSubkategori.value = ''
  if (filterOwner.value !== 'proli' || !filterProli.value) {
    filterSubkategoriOptions.value = []
    return
  }
  filterSubkategoriOptions.value = allSubkategori.value
    .filter((x) => x.proli_id === Number(filterProli.value))
    .map((x) => ({ value: x.id, label: x.nama }))
}

// Saat filter owner/proli berubah → muat ulang daftar subkategori filter
watch([filterOwner, filterProli], () => {
  loadFilterSubkategori()
})

// Muat subkategori milik proli yang dipilih (form tambah/edit)
async function loadSubkategori() {
  if (form.value.owner_type !== 'proli' || !form.value.proli_id) {
    optionState.value.subkategori = []
    form.value.subkategori_id = ''
    return
  }
  try {
    const res = await admin.master.list('subkategori', { per_page: 100, proli_id: form.value.proli_id })
    optionState.value.subkategori = res.data.map((x: any) => ({ value: x.id, label: x.nama }))
    // Kalau subkategori lama tidak cocok dengan proli baru → kosongkan
    if (
      form.value.subkategori_id &&
      !optionState.value.subkategori.some((o) => o.value === Number(form.value.subkategori_id))
    ) {
      form.value.subkategori_id = ''
    }
  } catch {
    optionState.value.subkategori = []
  }
}

// Saat owner atau proli berubah (form) → muat ulang daftar subkategori
watch(
  () => [form.value.owner_type, form.value.proli_id],
  () => {
    loadSubkategori()
  }
)

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((b) => {
    const matchQ = !q || b.nama.toLowerCase().includes(q) || (b.kode_qr ?? '').toLowerCase().includes(q)
    const matchOwner = filterOwner.value === 'all' || b.owner_type === filterOwner.value
    const matchProli = !filterProli.value || b.proli_id === Number(filterProli.value)
    const matchSub = !filterSubkategori.value || b.subkategori_id === Number(filterSubkategori.value)
    return matchQ && matchOwner && matchProli && matchSub
  })
})

// Kelompokkan barang per subkategori biar rapi; yang tanpa subkategori masuk grup terakhir
const groups = computed(() => {
  const map = new Map<string, Barang[]>()
  const noSub: Barang[] = []
  for (const b of filtered.value) {
    const key = b.subkategori?.nama
    if (key) {
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    } else {
      noSub.push(b)
    }
  }
  const result: { label: string; proli?: string; items: Barang[] }[] = []
  for (const [label, list] of map) {
    result.push({ label, proli: filtered.value.find((b) => b.subkategori?.nama === label)?.subkategori?.proli?.nama, items: list })
  }
  result.sort((a, b) => a.label.localeCompare(b.label))
  if (noSub.length) {
    result.push({ label: 'Tanpa Subkategori', items: noSub })
  }
  return result
})

const totalShown = computed(() => filtered.value.length)

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
    const payload = {
      nama: form.value.nama,
      deskripsi: form.value.deskripsi || null,
      owner_type: form.value.owner_type,
      kategori_id: form.value.kategori_id ? Number(form.value.kategori_id) : null,
      subkategori_id: form.value.subkategori_id ? Number(form.value.subkategori_id) : null,
      ruangan_id: form.value.ruangan_id ? Number(form.value.ruangan_id) : null,
      proli_id: form.value.proli_id ? Number(form.value.proli_id) : null
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
  form.value.subkategori_id = b?.subkategori_id != null ? String(b.subkategori_id) : ''
  form.value.ruangan_id = b?.ruangan_id != null ? String(b.ruangan_id) : ''
  form.value.proli_id = b?.proli_id != null ? String(b.proli_id) : ''
  showForm.value = true
  error.value = null
  loadSubkategori()
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  form.value.nama = ''
  form.value.deskripsi = ''
  form.value.kategori_id = ''
  form.value.subkategori_id = ''
  form.value.ruangan_id = ''
  form.value.proli_id = ''
  optionState.value.subkategori = []
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

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    aktif: 'bg-emerald-100 text-emerald-800',
    rusak: 'bg-rose-100 text-rose-800',
    dipinjam: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-amber-100 text-amber-800'
  }
  return map[s] ?? 'bg-gray-100 text-gray-700'
}

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
        <h2 class="text-2xl font-bold text-gray-900">Data Barang</h2>
        <p class="text-sm text-gray-500 mt-1">Kelola seluruh aset barang sekolah, dikelompokkan per subkategori.</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition shadow-sm"
        @click="openForm()"
      >
        <Plus class="w-4 h-4" />
        Tambah Barang
      </button>
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
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi Barang (tampil saat scan QR)</label>
          <textarea
            v-model="form.deskripsi"
            rows="3"
            placeholder="Contoh: Proyektor LCD 3LCD 3600 lumen untuk presentasi dan media pembelajaran…"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Owner</label>
          <select v-model="form.owner_type" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="sarpras">Sarpras</option>
            <option value="proli">Proli</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
          <select v-model="form.kategori_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">— Pilih —</option>
            <option v-for="o in optionState.kategori" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ruangan</label>
          <select v-model="form.ruangan_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">— Pilih —</option>
            <option v-for="o in optionState.ruangan" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div v-if="form.owner_type === 'proli'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Proli</label>
          <select v-model="form.proli_id" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">— Pilih —</option>
            <option v-for="o in optionState.proli" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
        <div v-if="form.owner_type === 'proli'">
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Subkategori{{ proliLabel ? ` (${proliLabel})` : '' }}
          </label>
          <select
            v-model="form.subkategori_id"
            :disabled="!form.proli_id"
            class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="">{{ form.proli_id ? '— Pilih —' : 'Pilih proli terlebih dahulu' }}</option>
            <option v-for="o in optionState.subkategori" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
          <p class="mt-1 text-xs text-gray-400">Subkategori khusus proli (kelola di Master Data → Subkategori Barang).</p>
        </div>
        <div class="sm:col-span-2 flex gap-3 pt-2">
          <button
            type="submit"
            :disabled="saving"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
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
          class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <!-- Pilihan Owner: Semua / Sarpras / Proli -->
        <button
          v-for="o in ([{v:'all',l:'Semua'},{v:'sarpras',l:'Sarpras'},{v:'proli',l:'Proli'}] as const)"
          :key="o.v"
          class="px-3 py-2 rounded-xl text-sm font-medium border transition"
          :class="filterOwner === o.v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          @click="filterOwner = o.v"
        >
          {{ o.l }}
        </button>

        <!-- Pilihan Proli (muncul saat filter Proli) -->
        <select
          v-if="filterOwner === 'proli'"
          v-model="filterProli"
          class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          title="Filter proli"
        >
          <option value="">Semua Proli</option>
          <option v-for="o in filterProliOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>

        <!-- Pilihan Subkategori (muncul saat filter Proli + proli dipilih) -->
        <select
          v-if="filterOwner === 'proli' && filterProli"
          v-model="filterSubkategori"
          class="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          title="Filter subkategori"
        >
          <option value="">Semua Subkategori</option>
          <option v-for="o in filterSubkategoriOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
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

    <!-- Table (dikelompokkan per subkategori) -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th class="px-5 py-3">Nama Barang</th>
              <th class="px-5 py-3">Kode QR</th>
              <th class="px-5 py-3">Owner</th>
              <th class="px-5 py-3">Status</th>
              <th class="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <!-- Baris header grup per subkategori -->
            <template v-for="(g, gi) in groups" :key="g.label">
              <tr class="bg-blue-50/60">
                <td colspan="5" class="px-5 py-2.5">
                  <div class="flex items-center gap-2">
                    <FolderTree class="w-4 h-4 text-blue-600 shrink-0" />
                    <span class="font-semibold text-blue-900">{{ g.label }}</span>
                    <span v-if="g.proli" class="text-xs text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">{{ g.proli }}</span>
                    <span class="text-xs text-gray-400">({{ g.items.length }})</span>
                  </div>
                </td>
              </tr>
              <tr v-for="b in g.items" :key="b.id" class="hover:bg-gray-50/50 transition">
                <td class="px-5 py-3.5">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Boxes class="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div class="font-medium text-gray-900">{{ b.nama }}</div>
                      <div class="text-xs text-gray-400">
                        {{ b.kategori?.nama ?? 'Tanpa kategori' }}{{ b.subkategori?.nama ? ' · ' + b.subkategori.nama : '' }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-3.5">
                  <span class="inline-flex items-center gap-1.5 text-xs font-mono text-gray-600">
                    <QrCode class="w-3.5 h-3.5 text-gray-400" />
                    {{ b.kode_qr }}
                  </span>
                </td>
                <td class="px-5 py-3.5">
                  <span class="text-xs px-2 py-1 rounded-full" :class="b.owner_type === 'sarpras' ? 'bg-blue-100 text-blue-800' : 'bg-violet-100 text-violet-800'">
                    {{ b.owner_type === 'proli' ? (b.proli?.nama ?? 'Proli') : 'Sarpras' }}
                  </span>
                </td>
                <td class="px-5 py-3.5">
                  <span class="text-xs px-2 py-1 rounded-full" :class="statusBadge(b.status)">
                    {{ b.status }}
                  </span>
                </td>
                <td class="px-5 py-3.5 text-right">
                  <button class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="Edit" @click="openForm(b)">
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button class="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition ml-1" title="Hapus" @click="remove(b.id)">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </template>
            <tr v-if="!filtered.length && !loading">
              <td colspan="5" class="px-5 py-12 text-center text-gray-400">
                <Boxes class="w-8 h-8 mx-auto mb-2 text-gray-300" />
                {{ items.length ? 'Tidak ada barang yang cocok.' : 'Belum ada data barang. Klik "Tambah Barang" untuk memulai.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-400">Memuat data…</div>
    </div>
  </div>
</template>
