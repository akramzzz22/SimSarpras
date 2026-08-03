<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  Boxes,
  Plus,
  Search,
  QrCode,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw
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
const filterOwner = ref<'all' | 'sarpras' | 'proli'>('all')

const form = ref({
  nama: '',
  deskripsi: '',
  owner_type: 'sarpras' as 'sarpras' | 'proli',
  kategori_id: '',
  ruangan_id: '',
  proli_id: ''
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return items.value.filter((b) => {
    const matchQ = !q || b.nama.toLowerCase().includes(q) || (b.kode_qr ?? '').toLowerCase().includes(q)
    const matchOwner = filterOwner.value === 'all' || b.owner_type === filterOwner.value
    return matchQ && matchOwner
  })
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
    const payload = {
      nama: form.value.nama,
      deskripsi: form.value.deskripsi || null,
      owner_type: form.value.owner_type,
      kategori_id: form.value.kategori_id ? Number(form.value.kategori_id) : null,
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
  form.value.ruangan_id = b?.ruangan_id != null ? String(b.ruangan_id) : ''
  form.value.proli_id = b?.proli_id != null ? String(b.proli_id) : ''
  showForm.value = true
  error.value = null
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  form.value.nama = ''
  form.value.deskripsi = ''
  form.value.kategori_id = ''
  form.value.ruangan_id = ''
  form.value.proli_id = ''
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

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <!-- Header + actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-bold text-gray-900">Data Barang</h2>
        <p class="text-sm text-gray-500 mt-1">Kelola seluruh aset barang sekolah.</p>
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
          <label class="block text-sm font-medium text-gray-700 mb-1">Kategori ID (opsional)</label>
          <input v-model="form.kategori_id" type="number" placeholder="1" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ruangan ID (opsional)</label>
          <input v-model="form.ruangan_id" type="number" placeholder="1" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Proli ID (opsional)</label>
          <input v-model="form.proli_id" type="number" placeholder="1" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
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
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="search"
          placeholder="Cari nama atau kode QR…"
          class="w-full rounded-xl border border-gray-200 pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="flex gap-2">
        <button
          v-for="o in ([{v:'all',l:'Semua'},{v:'sarpras',l:'Sarpras'},{v:'proli',l:'Proli'}] as const)"
          :key="o.v"
          class="px-3 py-2 rounded-xl text-sm font-medium border transition"
          :class="filterOwner === o.v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
          @click="filterOwner = o.v"
        >
          {{ o.l }}
        </button>
        <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50" title="Muat ulang" @click="load">
          <RefreshCw class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Table -->
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
            <tr v-for="b in filtered" :key="b.id" class="hover:bg-gray-50/50 transition">
              <td class="px-5 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Boxes class="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">{{ b.nama }}</div>
                    <div class="text-xs text-gray-400">{{ b.kategori?.nama ?? 'Tanpa kategori' }}</div>
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
                  {{ b.owner_type }}
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
