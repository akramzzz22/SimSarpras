<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  LayoutDashboard,
  Boxes,
  FileText,
  ClipboardList,
  Store,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Building2,
  GraduationCap,
  Users,
  QrCode,
  ArrowLeftRight,
  ClipboardCheck,
  CalendarClock,
  PackageCheck,
  UserCog,
  Database,
  Wrench,
  KeyRound
} from 'lucide-vue-next'
import { useAuthService } from '~/services/api/auth'

const authStore = useAuthStore()
const { logout } = useAuthService()
const route = useRoute()

const sidebarOpen = ref(false)

const nav = [
  {
    title: 'Dashboard',
    to: '/admin',
    icon: LayoutDashboard
  },
  {
    title: 'Asset',
    icon: Boxes,
    children: [
      { title: 'Data Barang', to: '/admin/asset/data-barang', icon: Boxes },
      { title: 'Mutasi Barang', to: '/admin/asset/mutasi-barang', icon: ArrowLeftRight },
      { title: 'QR Code', to: '/admin/asset/qr-code', icon: QrCode },
      { title: 'Stock Opname', to: '/admin/asset/stock-opname', icon: ClipboardCheck }
    ]
  },
  {
    title: 'Master Data',
    icon: Database,
    children: [
      { title: 'Gedung', to: '/admin/master-data/gedung', icon: Building2 },
      { title: 'Murid', to: '/admin/master-data/murid', icon: Users },
      { title: 'Jurusan', to: '/admin/master-data/jurusan', icon: GraduationCap },
      { title: 'Kelas', to: '/admin/master-data/kelas', icon: GraduationCap },
      { title: 'Proli', to: '/admin/master-data/proli', icon: GraduationCap },
      { title: 'Ruangan', to: '/admin/master-data/ruangan', icon: Building2 },
      { title: 'Kategori Barang', to: '/admin/master-data/kategori-barang', icon: Boxes },
      { title: 'Subkategori Barang', to: '/admin/master-data/subkategori', icon: Boxes },
      { title: 'Vendor', to: '/admin/master-data/vendor', icon: Store }
    ]
  },
  {
    title: 'Maintenance',
    icon: Wrench,
    children: [
      { title: 'Jadwal', to: '/admin/maintenance/jadwal', icon: CalendarClock },
      { title: 'Laporan Kerusakan', to: '/admin/maintenance/laporan-kerusakan', icon: FileText },
      { title: 'Penugasan', to: '/admin/maintenance/penugasan', icon: ClipboardList }
    ]
  },
  {
    title: 'Peminjaman',
    icon: ClipboardCheck,
    children: [
      { title: 'Approval', to: '/admin/peminjaman/approval', icon: ClipboardCheck },
      { title: 'Pengembalian', to: '/admin/peminjaman/pengembalian', icon: PackageCheck }
    ]
  },
  { title: 'Laporan', to: '/admin/laporan', icon: FileText },
  {
    title: 'Pengaturan',
    icon: Settings,
    children: [
      { title: 'Akun', to: '/admin/pengaturan/akun', icon: KeyRound },
      { title: 'Role', to: '/admin/pengaturan/role', icon: UserCog }
    ]
  }
]

// ---- State akordeon ----
const openGroups = ref<Record<string, boolean>>({})

function isActive(to: string) {
  return route.path === to
}

function isGroupOpen(item: any) {
  if (!item.children) return false
  return openGroups.value[item.title] ?? item.children.some((c: any) => isActive(c.to))
}

function toggleGroup(item: any) {
  if (!item.children) return
  openGroups.value = { ...openGroups.value, [item.title]: !isGroupOpen(item) }
}

// Auto-buka grup yang berisi halaman aktif
watch(
  () => route.path,
  (path) => {
    const group = nav.find((n) => n.children?.some((c) => c.to === path))
    if (group) {
      openGroups.value = { ...openGroups.value, [group.title]: true }
    }
  },
  { immediate: true }
)

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

const pageTitle = computed(() => (route.meta.title as string | undefined) || 'Dashboard')
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Overlay mobile -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/40 z-30 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-200 flex flex-col transform transition-transform duration-200 lg:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Brand -->
      <div class="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
        <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
          <Boxes class="w-5 h-5 text-white" />
        </div>
        <div class="min-w-0">
          <div class="font-semibold text-white truncate">Aset Sekolah</div>
          <div class="text-xs text-slate-400">Admin Sarpras</div>
        </div>
        <button class="ml-auto lg:hidden text-slate-400" @click="sidebarOpen = false">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <template v-for="item in nav" :key="item.title">
          <!-- Item tanpa children -->
          <NuxtLink
            v-if="!item.children"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition hover:bg-slate-800"
            :class="isActive(item.to!) ? 'bg-blue-600 text-white' : 'text-slate-300'"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0" />
            <span>{{ item.title }}</span>
          </NuxtLink>

          <!-- Grup akordeon -->
          <div v-else class="pt-2">
            <button
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition hover:bg-slate-800"
              :class="isGroupOpen(item) ? 'text-white' : 'text-slate-300'"
              :aria-expanded="isGroupOpen(item)"
              @click="toggleGroup(item)"
            >
              <component :is="item.icon" class="w-4 h-4 shrink-0" />
              <span class="flex-1 text-left">{{ item.title }}</span>
              <ChevronRight
                class="w-4 h-4 shrink-0 transition-transform duration-200"
                :class="isGroupOpen(item) ? 'rotate-90' : 'text-slate-500'"
              />
            </button>

            <!-- Sub-item -->
            <div
              class="grid overflow-hidden accordion-body"
              :class="isGroupOpen(item) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 accordion-closed'"
              :aria-hidden="!isGroupOpen(item)"
            >
              <div class="min-h-0 overflow-hidden">
                <div class="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-0.5">
                  <NuxtLink
                    v-for="child in item.children"
                    :key="child.to"
                    :to="child.to"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition hover:bg-slate-800"
                    :class="isActive(child.to) ? 'bg-blue-600 text-white' : 'text-slate-400'"
                  >
                    <component :is="child.icon" class="w-4 h-4 shrink-0" />
                    <span>{{ child.title }}</span>
                    <ChevronRight v-if="isActive(child.to)" class="w-4 h-4 ml-auto shrink-0" />
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </template>
      </nav>

      <!-- User + Logout -->
      <div class="p-3 border-t border-slate-800">
        <div class="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div class="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-white">
            {{ (authStore.user?.name ?? 'A').charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-white truncate">{{ authStore.user?.name ?? 'Admin' }}</div>
            <div class="text-xs text-slate-400 capitalize">{{ authStore.role?.replace('_', ' ') }}</div>
          </div>
          <button
            class="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Keluar"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="lg:pl-72 flex flex-col min-h-screen">
      <!-- Topbar -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 lg:px-8 sticky top-0 z-20">
        <button class="lg:hidden p-2 rounded-lg hover:bg-gray-100" @click="sidebarOpen = true">
          <Menu class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-lg font-semibold text-gray-900">
            {{ pageTitle }}
          </h1>
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-500">
          <UserCog class="w-4 h-4" />
          <span class="hidden sm:inline capitalize">{{ authStore.role?.replace('_', ' ') }}</span>
        </div>
      </header>

      <main class="flex-1 p-4 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Animasi akordeon: grid-template-rows + visibility agar konten yang tertutup
   benar-benar tidak fokusable oleh keyboard / screen reader */
.accordion-body {
  visibility: visible;
  transition:
    grid-template-rows 0.3s ease-in-out,
    opacity 0.3s ease-in-out,
    visibility 0s linear 0s;
}

.accordion-closed {
  visibility: hidden;
  transition:
    grid-template-rows 0.3s ease-in-out,
    opacity 0.3s ease-in-out,
    visibility 0s linear 0.3s;
}
</style>
