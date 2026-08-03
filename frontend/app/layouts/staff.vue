<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  History,
  User,
  LogOut,
  Boxes,
  ClipboardCheck,
  FileText,
  ArrowLeftRight,
  Menu,
  X
} from 'lucide-vue-next'
import { useAuthService } from '~/services/api/auth'

const authStore = useAuthStore()
const { logout } = useAuthService()
const route = useRoute()

const sidebarOpen = ref(false)

const navMap: Record<string, { title: string; to: string; icon: any }[]> = {
  staff_sarpras: [
    { title: 'Dashboard', to: '/staff', icon: LayoutDashboard },
    { title: 'Tugas', to: '/staff/tugas', icon: ClipboardList },
    { title: 'Maintenance', to: '/staff/maintenance', icon: Wrench },
    { title: 'Riwayat', to: '/staff/riwayat', icon: History },
    { title: 'Profil', to: '/staff/profil', icon: User }
  ],
  kaproli: [
    { title: 'Dashboard', to: '/kaproli', icon: LayoutDashboard },
    { title: 'Approval', to: '/kaproli/approval', icon: ClipboardCheck },
    { title: 'Data Barang', to: '/kaproli/data-barang', icon: Boxes },
    { title: 'Laporan Kerusakan', to: '/kaproli/laporan-kerusakan', icon: FileText },
    { title: 'Peminjaman', to: '/kaproli/peminjaman', icon: ArrowLeftRight },
    { title: 'Riwayat', to: '/kaproli/riwayat', icon: History }
  ]
}

const nav = computed(() => navMap[authStore.role ?? ''] ?? navMap.staff_sarpras)
const pageTitle = computed(() => (route.meta.title as string | undefined) || 'Dashboard')

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
  <div class="min-h-screen bg-gray-50">
    <!-- Overlay mobile -->
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/40 z-30 md:hidden" @click="sidebarOpen = false" />

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 md:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="h-16 flex items-center gap-3 px-5 border-b border-gray-100">
        <div class="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center">
          <Wrench class="w-5 h-5 text-white" />
        </div>
        <div class="min-w-0">
          <div class="font-semibold text-gray-900 truncate">Aset Sekolah</div>
          <div class="text-xs text-gray-400 capitalize">{{ authStore.role?.replace('_', ' ') }}</div>
        </div>
        <button class="ml-auto md:hidden text-gray-400" @click="sidebarOpen = false">
          <X class="w-5 h-5" />
        </button>
      </div>

      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition"
          :class="isActive(item.to) ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100'"
        >
          <component :is="item.icon" class="w-4 h-4" />
          {{ item.title }}
        </NuxtLink>
      </nav>

      <div class="p-3 border-t border-gray-100">
        <div class="flex items-center gap-3 px-2 py-2">
          <div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
            {{ (authStore.user?.name ?? 'U').charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ authStore.user?.name ?? 'User' }}</div>
            <div class="text-xs text-gray-400 capitalize">{{ authStore.role?.replace('_', ' ') }}</div>
          </div>
          <button class="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Keluar" @click="handleLogout">
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="md:pl-64 flex flex-col min-h-screen">
      <header class="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 lg:px-8 sticky top-0 z-20">
        <button class="md:hidden p-2 rounded-lg hover:bg-gray-100" @click="sidebarOpen = true">
          <Menu class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-lg font-semibold text-gray-900">{{ pageTitle }}</h1>
        </div>
      </header>

      <main class="flex-1 p-4 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
