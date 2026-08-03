<script setup lang="ts">
import { ref } from 'vue'
import { useAuthService } from '~/services/api/auth'

definePageMeta({ middleware: ['guest'] })

const authStore = useAuthStore()
const { login } = useAuthService()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

async function submit() {
  if (loading.value) return
  error.value = null
  loading.value = true

  try {
    const res = await login({ email: email.value, password: password.value })
    authStore.setSession(res.token, res.user, res.role as UserRole)
    await navigateTo(roleHome(res.role))
  } catch (e: any) {
    error.value = e?.data?.errors?.email?.[0] ?? 'Email atau password salah.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-b from-blue-700 to-blue-900">
    <header class="h-14 flex items-center px-4">
      <div class="text-white font-semibold text-sm">Sistem Manajemen Aset Sekolah</div>
    </header>

    <main class="flex-1 flex items-center justify-center p-6">
      <form
        class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4"
        @submit.prevent="submit"
      >
        <div class="text-center space-y-1">
          <h1 class="text-xl font-semibold text-neutral-900">Masuk</h1>
          <p class="text-sm text-neutral-500">Gunakan akun yang sudah terdaftar</p>
        </div>

        <div v-if="error" class="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-600">
          {{ error }}
        </div>

        <div class="space-y-1.5">
          <label for="email" class="block text-sm font-medium text-neutral-700">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            placeholder="admin@example.com"
            class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div class="space-y-1.5">
          <label for="password" class="block text-sm font-medium text-neutral-700">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="••••••••"
            class="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Memproses…' : 'Masuk' }}
        </button>

        <p class="text-xs text-center text-neutral-400">
          Demo: admin@example.com / password
        </p>
      </form>
    </main>
  </div>
</template>
