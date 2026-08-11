<script setup lang="ts">
import { ref, computed } from 'vue'
import { User, Mail, ShieldCheck, LogOut, Loader2 } from 'lucide-vue-next'
import { useAuthService } from '~/services/api/auth'

definePageMeta({ layout: 'staff', middleware: ['auth', 'staff'], title: 'Profil' })

const authStore = useAuthStore()
const { logout } = useAuthService()

// Semua role user (double job), mis. guru + kaproli
const displayRoles = computed(() => {
  const list = authStore.roles.length ? authStore.roles : authStore.role ? [authStore.role] : []
  return list.map((r) => String(r)).filter(Boolean)
})

const loading = ref(false)

async function handleLogout() {
  loading.value = true
  try {
    await logout()
  } catch {
    // tetap logout lokal
  } finally {
    authStore.logout()
    await navigateTo('/login')
  }
}
</script>

<template>
  <div class="max-w-md mx-auto space-y-4">
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
      <div class="w-20 h-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center text-2xl font-bold text-emerald-700">
        {{ (authStore.user?.name ?? 'U').charAt(0).toUpperCase() }}
      </div>
      <h2 class="mt-3 text-sm font-bold text-gray-900">{{ authStore.user?.name ?? 'User' }}</h2>
      <div class="flex flex-wrap items-center justify-center gap-1 mt-1">
        <span
          v-for="r in displayRoles"
          :key="r"
          class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-700"
        >
          <ShieldCheck class="w-3.5 h-3.5" />
          {{ r.replace('_', ' ') }}
        </span>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
      <div class="px-5 py-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><User class="w-4 h-4 text-blue-600" /></div>
        <div>
          <div class="text-xs text-gray-400">Nama</div>
          <div class="text-sm font-medium text-gray-900">{{ authStore.user?.name ?? '-' }}</div>
        </div>
      </div>
      <div class="px-5 py-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Mail class="w-4 h-4 text-blue-600" /></div>
        <div>
          <div class="text-xs text-gray-400">Email</div>
          <div class="text-sm font-medium text-gray-900">{{ authStore.user?.email ?? '-' }}</div>
        </div>
      </div>
    </div>

    <button
      class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 text-sm font-semibold hover:bg-rose-100 transition disabled:opacity-60"
      :disabled="loading"
      @click="handleLogout"
    >
      <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
      <LogOut v-else class="w-4 h-4" />
      Keluar
    </button>
  </div>
</template>
