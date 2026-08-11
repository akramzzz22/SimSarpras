<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ShieldCheck, Plus, Trash2, Loader2, RefreshCw, Users, X } from 'lucide-vue-next'
import { useAdminService } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Pengaturan Role' })

const admin = useAdminService()

const roles = ref<{ id: number; name: string; users_count?: number }[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const saving = ref(false)

const showForm = ref(false)
const newRole = ref('')
const formError = ref<string | null>(null)

const roleColors: Record<string, string> = {
  admin: 'bg-red-50 text-red-700',
  staff_sarpras: 'bg-teal-50 text-teal-700',
  kaproli: 'bg-violet-50 text-violet-700',
  guru: 'bg-emerald-50 text-emerald-700',
  murid: 'bg-amber-50 text-amber-700',
  kepsek: 'bg-rose-50 text-rose-700'
}

async function load() {
  loading.value = true
  error.value = null
  try {
    roles.value = await admin.roles.list()
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat daftar role.'
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!newRole.value.trim()) {
    formError.value = 'Nama role wajib diisi.'
    return
  }
  saving.value = true
  formError.value = null
  try {
    await admin.roles.create({ name: newRole.value.trim().toLowerCase().replace(/\s+/g, '_') })
    newRole.value = ''
    showForm.value = false
    await load()
  } catch (e: any) {
    const err = e?.data?.errors
    formError.value = err?.name?.[0] ?? e?.data?.message ?? 'Gagal membuat role.'
  } finally {
    saving.value = false
  }
}

async function remove(r: { id: number; name: string }) {
  if (!confirm(`Yakin ingin menghapus role "${r.name}"?`)) return
  try {
    await admin.roles.remove(r.id)
    await load()
  } catch (e: any) {
    alert(e?.data?.message ?? 'Gagal menghapus role.')
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Pengaturan Role</h2>
        <p class="text-sm text-gray-500 mt-1">Kelola role pengguna sistem. Role dipakai untuk mengatur hak akses setiap akun.</p>
      </div>
      <div class="flex gap-2">
        <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
          <RefreshCw class="w-4 h-4" />
        </button>
        <button
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition shadow-sm"
          @click="showForm = !showForm"
        >
          <Plus class="w-4 h-4" />
          Tambah Role
        </button>
      </div>
    </div>

    <div v-if="showForm" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 class="font-semibold text-gray-900 mb-4">Tambah Role Baru</h3>
      <form class="flex flex-col sm:flex-row gap-3" @submit.prevent="submit">
        <input
          v-model="newRole"
          placeholder="Contoh: admin_gudang"
          class="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500"
        />
        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="saving"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            Simpan
          </button>
          <button type="button" class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50" @click="showForm = false">
            Batal
          </button>
        </div>
      </form>
      <p v-if="formError" class="mt-3 text-sm text-rose-600">{{ formError }}</p>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div v-for="r in roles" :key="r.id" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
          <ShieldCheck class="w-5 h-5 text-red-600" />
        </div>
        <div class="min-w-0 flex-1">
          <span class="text-xs px-2 py-1 rounded font-medium" :class="roleColors[r.name] ?? 'bg-gray-50 text-gray-700'">
            {{ r.name.replace('_', ' ') }}
          </span>
          <div class="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
            <Users class="w-3.5 h-3.5" />
            {{ r.users_count ?? 0 }} pengguna
          </div>
        </div>
        <button
          v-if="r.name !== 'admin'"
          class="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
          title="Hapus"
          @click="remove(r)"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>

      <div v-if="!roles.length && !loading" class="sm:col-span-2 lg:col-span-3 py-12 text-center">
        <X class="w-10 h-10 mx-auto mb-3 text-gray-300" />
        <p class="text-gray-400 text-sm">Belum ada role.</p>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
