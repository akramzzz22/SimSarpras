<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Inbox,
  Download
} from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'
import Pagination from '~/components/pagination.vue'

export interface CrudOption {
  value: string | number
  label: string
}

export interface CrudColumn {
  key: string
  label: string
  render?: (item: any) => string
  badge?: (item: any) => { text: string; cls: string }
}

export interface CrudRowAction {
  /** Ikon lucide (komponen) */
  icon: any
  title: string
  /** Warna tombol */
  cls?: string
  /** Tampilkan aksi ini hanya untuk item tertentu */
  show?: (item: any) => boolean
  onClick: (item: any) => void
}

export interface CrudField {
  key: string
  label: string
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select'
  required?: boolean
  placeholder?: string
  hint?: string
  /** Select dengan opsi statis */
  options?: CrudOption[]
  /** Select dengan opsi dinamis (key dipakai untuk memuat opsi) */
  optionLoaderKey?: string
  /** Select yang opsinya bergantung pada nilai field lain (mis. Kelas bergantung pada Jurusan) */
  dependsOn?: string
  /** Pada mode edit, field ini opsional & tidak dikirim jika kosong */
  optionalOnEdit?: boolean
  /** Fungsi untuk mengambil nilai saat mode edit (mis. dari relasi) */
  populate?: (item: any) => any
  colSpan?: 'full' | 'half'
}

const props = defineProps<{
  resource: string
  title: string
  description?: string
  columns: CrudColumn[]
  fields: CrudField[]
  searchKeys?: string[]
  searchPlaceholder?: string
  deleteLabel?: (item: any) => string
  /** Aksi tambahan per baris (mis. generate akun murid) */
  rowActions?: CrudRowAction[]
  optionLoaders?: Record<string, (deps?: Record<string, any>) => Promise<CrudOption[]>>
  /** Jika diisi, baris tabel dikelompokkan berdasarkan nilai key ini (mis. 'kelas')
   *  Bisa berupa nama key langsung atau fungsi yang menerima item → label grup. */
  groupBy?: string | ((item: any) => string)
}>()

const admin = useAdminService()

const items = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const search = ref('')
const showForm = ref(false)
const editingId = ref<number | null>(null)
const form = ref<Record<string, any>>({})
const optionCache = ref<Record<string, CrudOption[]>>({})
const formError = ref<string | null>(null)

/** Opsi select dinamis yang bergantung pada field lain (mis. kelas per jurusan) */
const optionDeps = ref<Record<string, Record<string, any>>>({})
/** Nilai asli field induk saat mode edit (untuk tahu kapan user benar-benar ganti) */
const originalDeps = ref<Record<string, any>>({})

function matchesSearch(item: any): boolean {
  const q = search.value.toLowerCase()
  if (!q) return true
  const keys = props.searchKeys?.length
    ? props.searchKeys
    : props.columns.map((c) => c.key).filter((k) => k !== 'id')
  return keys.some((k) => String(item[k] ?? '').toLowerCase().includes(q))
}

const filtered = computed(() => items.value.filter(matchesSearch))

// ---- Pagination (20 data per halaman) ----
const page = ref(1)
const PER_PAGE = 20

const pagedRows = computed<CrudRow[]>(() =>
  rows.value.slice((page.value - 1) * PER_PAGE, page.value * PER_PAGE)
)

// Reset ke halaman pertama saat pencarian / data berubah
watch(filtered, () => {
  page.value = 1
})

type CrudRow =
  | { kind: 'group'; label: string; count: number }
  | { kind: 'item'; item: any }

/** Baris tabel: item biasa, atau header grup saat prop groupBy dipakai */
const rows = computed<CrudRow[]>(() => {
  if (!props.groupBy) {
    return filtered.value.map((item) => ({ kind: 'item', item }))
  }
  const groups = new Map<string, any[]>()
  for (const item of filtered.value) {
    const key =
      typeof props.groupBy === 'function'
        ? String(props.groupBy(item) || 'Tanpa Kelompok')
        : String(item[props.groupBy] || 'Tanpa Kelompok')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  const out: CrudRow[] = []
  for (const [label, group] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'id'))) {
    out.push({ kind: 'group', label, count: group.length })
    for (const item of group) out.push({ kind: 'item', item })
  }
  return out
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await admin.master.list(props.resource, { per_page: 100 })
    items.value = res.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data.'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {}
  for (const f of props.fields) {
    form.value[f.key] = ''
  }
}

async function openEdit(item: any) {
  editingId.value = item.id
  resetForm()
  // Simpan nilai asli field induk agar watch tidak menghapus pilihan saat edit
  for (const f of props.fields) {
    if (f.dependsOn) originalDeps.value[f.dependsOn] = item[f.dependsOn] ?? ''
  }
  for (const f of props.fields) {
    const raw = f.populate ? f.populate(item) : item[f.key]
    form.value[f.key] = raw ?? ''
  }
  formError.value = null
  showForm.value = true
  await ensureOptions()
}

async function loadOptionsFor(f: CrudField) {
  if (!f.optionLoaderKey) return
  const loader = props.optionLoaders?.[f.optionLoaderKey]
  if (!loader) return

  const deps: Record<string, any> = {}
  if (f.dependsOn) {
    const depVal = form.value[f.dependsOn]
    // Belum ada induk dipilih (mis. jurusan kosong) → opsi dikosongkan
    if (depVal === '' || depVal === null || depVal === undefined) {
      optionCache.value[f.optionLoaderKey] = []
      optionDeps.value[f.optionLoaderKey] = {}
      return
    }
    deps[f.dependsOn] = depVal
  }

  const depKey = JSON.stringify(deps)
  const key = f.optionLoaderKey
  const cached = optionDeps.value[key]?.[depKey]
  if (cached) {
    optionCache.value[key] = cached
    return
  }

  try {
    const opts = await loader(deps)
    if (!optionDeps.value[key]) optionDeps.value[key] = {}
    optionDeps.value[key][depKey] = opts
    optionCache.value[key] = opts
  } catch {
    // gagal memuat opsi — biarkan cache kosong agar dicoba lagi nanti
  }
}

async function ensureOptions() {
  for (const f of props.fields) {
    if (!f.optionLoaderKey) continue
    await loadOptionsFor(f)
  }
}

// Saat nilai field induk berubah (mis. jurusan), reset & muat ulang opsi dependen (mis. kelas)
watch(
  () => props.fields.filter((f): f is CrudField & { dependsOn: string } => !!f.dependsOn).map((f) => form.value[f.dependsOn]),
  async () => {
    for (const f of props.fields) {
      if (!f.dependsOn) continue
      // Hanya reset jika user benar-benar mengubah induk (bukan saat pengisian otomatis edit)
      const changed = form.value[f.dependsOn] !== originalDeps.value[f.dependsOn]
      if (changed) form.value[f.key] = ''
      await loadOptionsFor(f)
      // Nilai induk terbaru yang sudah diproses → jadi acuan perubahan berikutnya
      originalDeps.value[f.dependsOn] = form.value[f.dependsOn]
    }
  }
)

// Saat buka form baru, nilai asli induk = kosong
function openCreate() {
  editingId.value = null
  resetForm()
  formError.value = null
  showForm.value = true
  originalDeps.value = {}
}

function buildPayload(): Record<string, any> {
  const payload: Record<string, any> = {}
  for (const f of props.fields) {
    const v = form.value[f.key]
    if (editingId.value !== null && f.optionalOnEdit && v === '') continue
    if (f.type === 'number') {
      payload[f.key] = v === '' || v === null ? null : Number(v)
    } else {
      payload[f.key] = v === '' ? null : v
    }
  }
  return payload
}

async function submit() {
  for (const f of props.fields) {
    if (f.required && (!form.value[f.key] || form.value[f.key] === '')) {
      formError.value = `Field "${f.label}" wajib diisi.`
      return
    }
  }
  saving.value = true
  formError.value = null
  try {
    const body = buildPayload()
    if (editingId.value !== null) {
      await admin.master.update(props.resource, editingId.value, body)
    } else {
      await admin.master.create(props.resource, body)
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    const err = e?.data?.errors
    const firstKey = err ? Object.keys(err)[0] : null
    formError.value =
      (firstKey && err[firstKey]?.[0]) || e?.data?.message || 'Gagal menyimpan data.'
  } finally {
    saving.value = false
  }
}

async function remove(item: any) {
  const label = props.deleteLabel?.(item) ?? `data #${item.id}`
  if (!confirm(`Yakin ingin menghapus ${label}?`)) return
  try {
    await admin.master.remove(props.resource, item.id)
    await load()
  } catch {
    alert('Gagal menghapus data. Pastikan data tidak sedang dipakai.')
  }
}

/** Sedang mengambil seluruh halaman data untuk export. */
const exporting = ref(false)

/** Nilai sel untuk export: badge > render > nilai mentah kolom. */
function cellValue(col: CrudColumn, item: any): string {
  if (col.badge) return String(col.badge(item).text ?? '')
  if (col.render) return String(col.render(item) ?? '')
  const v = item[col.key]
  return v === null || v === undefined ? '' : String(v)
}

/**
 * Export seluruh data (semua halaman, bukan hanya 100 baris pertama yang dimuat)
 * ke CSV, tetap menghormati pencarian aktif. UTF-8 BOM (\uFEFF) agar karakter
 * Indonesia terbaca benar di Excel.
 */
async function exportCSV() {
  if (exporting.value) return
  exporting.value = true
  try {
    const all: any[] = []
    let page = 1
    for (;;) {
      const res = await admin.master.list(props.resource, { per_page: 100, page })
      all.push(...res.data)
      if (page >= res.last_page) break
      page++
    }

    const rows = all.filter(matchesSearch)
    if (!rows.length) {
      alert('Tidak ada data yang cocok untuk diexport.')
      return
    }

    const header = props.columns.map((c) => c.label)
    const csv = [
      header,
      ...rows.map((item) => props.columns.map((c) => cellValue(c, item)))
    ]
      .map((r) => r.map((c) => `"${String(c ?? '').replaceAll('"', '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.resource}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

/** Fokus input pencarian → border biru + shadow */
function onSearchFocus(e: FocusEvent) {
  const el = e.currentTarget as HTMLInputElement
  el.style.borderColor = '#1D4ED8'
  el.style.boxShadow = '0 0 0 2px rgba(29,78,216,0.15)'
}
function onSearchBlur(e: FocusEvent) {
  const el = e.currentTarget as HTMLInputElement
  el.style.borderColor = '#D1D5DB'
  el.style.boxShadow = 'none'
}

/** Hover tombol edit → biru */
function onEditEnter(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  el.style.color = '#1D4ED8'
  el.style.backgroundColor = '#EFF6FF'
}
function onEditLeave(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  el.style.color = '#9CA3AF'
  el.style.backgroundColor = 'transparent'
}

/** Hover tombol hapus → merah */
function onDeleteEnter(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  el.style.color = '#DC2626'
  el.style.backgroundColor = '#FEF2F2'
}
function onDeleteLeave(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  el.style.color = '#9CA3AF'
  el.style.backgroundColor = 'transparent'
}

onMounted(() => {
  load()
  ensureOptions()
})

defineExpose({ load })
</script>

<template>
  <div class="space-y-4">
    <!-- Header + aksi -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">{{ title }}</h2>
        <p v-if="description" class="text-sm text-gray-500 mt-1">{{ description }}</p>
      </div>
      <button
        class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition shadow-sm"
        style="background-color: #1D4ED8; color: #ffffff; border: 1px solid #1D4ED8;"
        @click="openCreate"
      >
        <Plus class="w-4 h-4" />
        Tambah
      </button>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          :placeholder="searchPlaceholder ?? 'Cari…'"
          class="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
          style="border-color: #D1D5DB;"
          @focus="onSearchFocus"
          @blur="onSearchBlur"
        />
      </div>
      <button
        class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition w-fit"
        title="Muat ulang"
        @click="load"
      >
        <RefreshCw class="w-4 h-4" />
      </button>
      <button
        class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition w-fit disabled:opacity-50"
        title="Export seluruh data ke CSV (bisa dibuka di Excel)"
        :disabled="!items.length || exporting"
        @click="exportCSV"
      >
        <Loader2 v-if="exporting" class="w-4 h-4 animate-spin" />
        <Download v-else class="w-4 h-4" />
        {{ exporting ? 'Mengexport…' : 'Export CSV' }}
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
      {{ error }}
    </p>

    <!-- Tabel boxed -->
    <div class="overflow-hidden" style="border: 1px solid #D1D5DB; border-radius: 8px; background-color: #ffffff;">
      <div class="overflow-x-auto">
        <table class="w-full" style="border-collapse: collapse;">
          <thead>
            <tr style="background-color: var(--app-surface-2, #F8F9FA);">
              <th v-for="c in columns" :key="c.key" class="font-semibold" style="padding: 10px 14px; font-size: 14px; color: var(--app-text-2, #374151); border-bottom: 1px solid var(--app-border-light, #E5E7EB); text-align: left;">{{ c.label }}</th>
              <th class="text-right" style="padding: 10px 14px; font-size: 14px; color: var(--app-text-2, #374151); border-bottom: 1px solid var(--app-border-light, #E5E7EB);">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in pagedRows" :key="row.kind === 'group' ? 'group-' + row.label : row.item.id">
              <!-- Header grup (saat prop groupBy dipakai) -->
              <tr v-if="row.kind === 'group'" style="background-color: #EFF6FF;">
                <td :colspan="columns.length + 1" style="padding: 8px 14px; border-bottom: 1px solid var(--app-border-light, #E5E7EB);">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold uppercase tracking-wider" style="color: #1D4ED8;">
                      {{ row.label }}
                    </span>
                    <span class="text-xs font-medium" style="color: #6B7280;">{{ row.count }} data</span>
                  </div>
                </td>
              </tr>

              <!-- Baris item -->
              <tr v-else class="hover:bg-gray-50/50 transition" style="border-bottom: 1px solid var(--app-border-light, #E5E7EB);">
                <td v-for="c in columns" :key="c.key" style="padding: 10px 14px;">
                  <span
                    v-if="c.badge"
                    class="text-xs px-2 py-1 rounded inline-block"
                    :class="c.badge(row.item).cls"
                  >
                    {{ c.badge(row.item).text }}
                  </span>
                  <span v-else-if="c.render">{{ c.render(row.item) }}</span>
                  <span v-else style="color: var(--app-text, #0F172A);">{{ row.item[c.key] ?? '—' }}</span>
                </td>
                <td class="text-right whitespace-nowrap" style="padding: 10px 14px;">
                  <button
                    v-for="a in (rowActions ?? []).filter((x) => !x.show || x.show(row.item))"
                    :key="a.title"
                    class="p-1.5 rounded-lg transition ml-1"
                    :class="a.cls ?? 'text-gray-400 hover:text-red-600 hover:bg-red-50'"
                    :title="a.title"
                    @click="a.onClick(row.item)"
                  >
                    <component :is="a.icon" class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1.5 rounded-lg transition ml-1"
                    style="color: #9CA3AF;"
                    title="Edit"
                    @click="openEdit(row.item)"
                    @mouseenter="onEditEnter"
                    @mouseleave="onEditLeave"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1.5 rounded-lg transition ml-1"
                    style="color: #9CA3AF;"
                    title="Hapus"
                    @click="remove(row.item)"
                    @mouseenter="onDeleteEnter"
                    @mouseleave="onDeleteLeave"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            </template>
            <tr v-if="!filtered.length && !loading">
              <td :colspan="columns.length + 1" style="padding: 40px 14px; text-align: center; color: var(--app-faint, #9CA3AF);">
                <Inbox class="w-8 h-8 mx-auto mb-2" style="color: #D1D5DB;" />
                {{ items.length ? 'Tidak ada data yang cocok.' : 'Belum ada data. Klik "Tambah" untuk memulai.' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="loading" style="padding: 20px 14px; text-align: center; font-size: 14px; color: var(--app-faint, #9CA3AF);">Memuat data…</div>
    </div>

    <!-- Pagination: 20 data per halaman -->
    <Pagination v-model:page="page" :total="filtered.length" :per-page="PER_PAGE" />

    <!-- Modal form -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showForm = false" />
      <div class="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 class="font-semibold text-gray-900">
            {{ editingId !== null ? 'Edit' : 'Tambah' }} {{ title }}
          </h3>
          <button class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" @click="showForm = false">
            <X class="w-5 h-5" />
          </button>
        </div>

        <form class="px-6 py-5 overflow-y-auto grid sm:grid-cols-2 gap-4" @submit.prevent="submit">
          <div
            v-for="f in fields"
            :key="f.key"
            :class="f.colSpan === 'full' ? 'sm:col-span-2' : ''"
          >
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ f.label }}
              <span v-if="f.required" class="text-rose-500">*</span>
            </label>

            <select
              v-if="f.type === 'select'"
              v-model="form[f.key]"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 bg-white"
            >
              <option value="">— Pilih —</option>
              <option
                v-for="opt in (f.options ?? optionCache[f.optionLoaderKey ?? ''] ?? [])"
                :key="String(opt.value)"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>

            <textarea
              v-else-if="f.type === 'textarea'"
              v-model="form[f.key]"
              :placeholder="f.placeholder"
              rows="3"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
            />

            <input
              v-else
              v-model="form[f.key]"
              :type="f.type ?? 'text'"
              :placeholder="f.placeholder"
              class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
            />

            <p v-if="f.hint" class="mt-1 text-xs text-gray-400">{{ f.hint }}</p>
          </div>

          <p v-if="formError" class="sm:col-span-2 text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {{ formError }}
          </p>

          <div class="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50"
              @click="showForm = false"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
            >
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              {{ saving ? 'Menyimpan…' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
