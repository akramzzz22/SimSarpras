<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ShieldCheck, KeyRound, Loader2, RefreshCw, CheckCircle2 } from 'lucide-vue-next'
import { useAdminService, type PermissionItem } from '~/services/api/admin'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Permission' })

const admin = useAdminService()

const roles = ref<{ id: number; name: string; users_count?: number }[]>([])
const permissions = ref<PermissionItem[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const savedMsg = ref<string | null>(null)

const selectedRoleId = ref<number | null>(null)
const selectedIds = ref<Set<number>>(new Set())

const selectedRole = computed(() => roles.value.find((r) => r.id === selectedRoleId.value))

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
    const [r, p] = await Promise.all([admin.roles.list(), admin.permissions.list()])
    roles.value = r
    permissions.value = p
    if (!selectedRoleId.value && r.length && r[0]) {
      await selectRole(r[0].id)
    } else if (selectedRoleId.value) {
      await loadRolePermissions(selectedRoleId.value)
    }
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal memuat data permission.'
  } finally {
    loading.value = false
  }
}

async function loadRolePermissions(roleId: number) {
  const ids = await admin.permissions.rolePermissions(roleId)
  selectedIds.value = new Set(ids)
}

async function selectRole(roleId: number) {
  selectedRoleId.value = roleId
  savedMsg.value = null
  await loadRolePermissions(roleId)
}

function toggle(id: number) {
  savedMsg.value = null
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

async function save() {
  if (!selectedRoleId.value) return
  saving.value = true
  savedMsg.value = null
  try {
    await admin.permissions.syncRolePermissions(selectedRoleId.value, [...selectedIds.value])
    savedMsg.value = 'Permission role berhasil disimpan.'
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Gagal menyimpan permission.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-sm font-bold text-gray-900">Permission</h2>
        <p class="text-sm text-gray-500 mt-1">Kelola hak akses (permission) setiap role pengguna.</p>
      </div>
      <button class="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Muat ulang" @click="load">
        <RefreshCw class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

    <div class="grid lg:grid-cols-[260px_1fr] gap-4">
      <!-- Daftar role -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
        <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-2 font-semibold text-gray-900">
          <ShieldCheck class="w-4 h-4 text-red-600" /> Role
        </div>
        <div class="p-2 space-y-1">
          <button
            v-for="r in roles"
            :key="r.id"
            class="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition"
            :class="selectedRoleId === r.id ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
            @click="selectRole(r.id)"
          >
            <span class="text-xs px-2 py-0.5 rounded font-semibold" :class="selectedRoleId === r.id ? 'bg-white/20 text-white' : roleColors[r.name] ?? 'bg-gray-50 text-gray-700'">
              {{ r.name.replace('_', ' ') }}
            </span>
            <span :class="selectedRoleId === r.id ? 'text-red-100' : 'text-gray-400'" class="text-xs">{{ r.users_count ?? 0 }}</span>
          </button>
          <div v-if="!roles.length && !loading" class="px-3 py-6 text-center text-sm text-gray-400">Belum ada role.</div>
        </div>
      </div>

      <!-- Checklist permission role terpilih -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 font-semibold text-gray-900">
            <KeyRound class="w-4 h-4 text-red-600" />
            Permission — <span class="text-red-600 capitalize">{{ (selectedRole?.name ?? '').replace('_', ' ') }}</span>
          </div>
          <button
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-60"
            :disabled="saving || !selectedRoleId"
            @click="save"
          >
            <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
            {{ saving ? 'Menyimpan…' : 'Simpan Permission' }}
          </button>
        </div>

        <p v-if="savedMsg" class="mx-5 mt-4 inline-flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
          <CheckCircle2 class="w-4 h-4" /> {{ savedMsg }}
        </p>

        <div class="p-5 grid sm:grid-cols-2 gap-2.5">
          <label
            v-for="p in permissions"
            :key="p.id"
            class="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 cursor-pointer transition hover:border-red-200 hover:bg-red-50/30"
            :class="selectedIds.has(p.id) ? 'border-red-200 bg-red-50/50' : ''"
          >
            <input
              type="checkbox"
              class="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              :checked="selectedIds.has(p.id)"
              @change="toggle(p.id)"
            />
            <span class="text-sm font-medium text-gray-700">{{ p.name }}</span>
          </label>
          <div v-if="!permissions.length && !loading" class="sm:col-span-2 py-8 text-center text-sm text-gray-400">Belum ada permission terdaftar.</div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-gray-400">Memuat data…</div>
  </div>
</template>
