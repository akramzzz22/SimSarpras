<script setup lang="ts">
import { computed } from 'vue'
import {
  Home,
  ArrowLeftRight,
  AlertTriangle,
  QrCode,
  History,
  BarChart3,
  FileText,
  Wallet,
  LogOut,
  ShieldCheck
} from 'lucide-vue-next'
import { useAuthService } from '~/services/api/auth'

const authStore = useAuthStore()
const { logout } = useAuthService()
const route = useRoute()

const navMap: Record<string, { title: string; to: string; icon: any }[]> = {
  guru: [
    { title: 'Beranda', to: '/guru', icon: Home },
    { title: 'Peminjaman', to: '/guru/peminjaman', icon: ArrowLeftRight },
    { title: 'Lapor', to: '/guru/lapor-kerusakan', icon: AlertTriangle },
    { title: 'Scan QR', to: '/guru/scan-qr', icon: QrCode },
    { title: 'Riwayat', to: '/guru/riwayat', icon: History }
  ],
  murid: [
    { title: 'Beranda', to: '/murid', icon: Home },
    { title: 'Peminjaman', to: '/murid/peminjaman', icon: ArrowLeftRight },
    { title: 'Lapor', to: '/murid/lapor', icon: AlertTriangle },
    { title: 'Scan QR', to: '/murid/scan-qr', icon: QrCode },
    { title: 'Riwayat', to: '/murid/riwayat', icon: History }
  ],
  kepsek: [
    { title: 'Beranda', to: '/kepsek', icon: Home },
    { title: 'Monitoring', to: '/kepsek/monitoring', icon: BarChart3 },
    { title: 'Laporan', to: '/kepsek/laporan', icon: FileText },
    { title: 'Approval', to: '/kepsek/approval-biaya', icon: Wallet }
  ]
}

const nav = computed(() => navMap[authStore.role ?? ''] ?? navMap.guru)
const pageTitle = computed(() => (route.meta.title as string | undefined) || 'Beranda')

function isActive(to: string) {
  return route.path === to
}

async function handleLogout() {
  try {
    await logout()
  } catch {
    // tetap logout lokal walau API gagal
  } finally {
    authStore.logout()
    await navigateTo('/login')
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50 max-w-md mx-auto">
    <!-- Header -->
    <header class="h-14 bg-white border-b border-gray-100 flex items-center gap-3 px-4 sticky top-0 z-10">
      <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
        <ShieldCheck class="w-4 h-4 text-white" />
      </div>
      <div class="flex-1 min-w-0">
        <h1 class="text-base font-semibold text-gray-900 truncate">{{ pageTitle }}</h1>
      </div>
      <button class="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Keluar" @click="handleLogout">
        <LogOut class="w-4 h-4" />
      </button>
    </header>

    <!-- Konten -->
    <main class="flex-1 p-4 pb-24">
      <slot />
    </main>

    <!-- Bottom nav -->
    <nav class="h-16 bg-white border-t border-gray-100 fixed bottom-0 left-0 right-0 max-w-md mx-auto flex items-stretch">
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition"
        :class="isActive(item.to) ? 'text-blue-600' : 'text-gray-400'"
      >
        <component :is="item.icon" class="w-5 h-5" />
        {{ item.title }}
      </NuxtLink>
    </nav>
  </div>
</template>
