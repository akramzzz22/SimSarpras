<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UserCog, Store, RefreshCw, Phone, MapPin, StickyNote } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Teknisi' })

const admin = useAdminService()

const staff = ref<any[]>([])
const vendor = ref<any[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [s, v] = await Promise.all([
      admin.master.list('users', { role: 'staff_sarpras', per_page: 100 }),
      admin.master.list('vendor', { per_page: 100 })
    ])
    staff.value = s.data
    vendor.value = v.data
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data teknisi.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Teknisi</h2>
        <p class="text-sm text-gray-500 mt-1">Daftar teknisi internal (staff sarpras) dan eksternal (vendor) untuk maintenance barang.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <!-- Teknisi internal -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <UserCog class="w-4 h-4 text-red-600" />
        <h3 class="font-semibold text-gray-900">Teknisi Internal (Staff Sarpras)</h3>
        <span class="text-xs px-2 py-0.5 rounded bg-gray-50 text-gray-700">{{ staff.length }}</span>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        <div v-for="u in staff" :key="u.id" class="rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition">
          <div class="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center font-semibold text-red-600 shrink-0">
            {{ (u.name ?? 'T').charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="font-medium text-gray-900 truncate">{{ u.name }}</div>
            <div class="text-xs text-gray-400">{{ u.no_hp ?? u.email ?? 'No. HP belum diisi' }}</div>
          </div>
        </div>
        <div v-if="!staff.length && !loading" class="sm:col-span-2 lg:col-span-3 py-8 text-center text-sm text-gray-400">Belum ada staff sarpras.</div>
      </div>
    </div>

    <!-- Teknisi eksternal (vendor) -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <Store class="w-4 h-4 text-violet-600" />
        <h3 class="font-semibold text-gray-900">Teknisi Eksternal (Vendor)</h3>
        <span class="text-xs px-2 py-0.5 rounded bg-gray-50 text-gray-700">{{ vendor.length }}</span>
      </div>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        <div v-for="v in vendor" :key="v.id" class="rounded-xl border border-gray-100 p-4 hover:shadow-sm transition">
          <div class="font-medium text-gray-900">{{ v.nama }}</div>
          <div class="mt-2 space-y-1 text-xs text-gray-500">
            <div v-if="v.kontak" class="flex items-center gap-1.5"><Phone class="w-3.5 h-3.5 text-gray-400" /> {{ v.kontak }}</div>
            <div v-if="v.alamat" class="flex items-center gap-1.5"><MapPin class="w-3.5 h-3.5 text-gray-400" /> {{ v.alamat }}</div>
            <div v-if="v.keterangan" class="flex items-center gap-1.5"><StickyNote class="w-3.5 h-3.5 text-gray-400" /> {{ v.keterangan }}</div>
          </div>
        </div>
        <div v-if="!vendor.length && !loading" class="sm:col-span-2 lg:col-span-3 py-8 text-center text-sm text-gray-400">Belum ada vendor terdaftar.</div>
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
