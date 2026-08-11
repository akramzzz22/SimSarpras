<script setup lang="ts">
import { ShieldX, ArrowLeft, LogIn } from 'lucide-vue-next'

const authStore = useAuthStore()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 p-6">
    <div class="text-center max-w-sm">
      <div class="w-16 h-16 mx-auto rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
        <ShieldX class="w-8 h-8 text-rose-500" />
      </div>
      <h1 class="text-sm font-bold text-gray-900">Akses Ditolak</h1>
      <p class="text-sm text-gray-500 mt-2">
        Anda tidak memiliki izin untuk mengakses halaman ini.
      </p>
      <div class="mt-6 flex flex-col gap-2">
        <NuxtLink
          :to="rolesHome(authStore.roles)"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
        >
          <ArrowLeft class="w-4 h-4" />
          Kembali ke Beranda
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <LogIn class="w-4 h-4" />
          Masuk dengan akun lain
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
