<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
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
  X,
  Bell,
  CheckCheck,
  CalendarClock
} from 'lucide-vue-next'
import { useAuthService } from '~/services/api/auth'
import { useAdminService, type AppNotification } from '~/services/api/admin'
import { useSekolah } from '~/composables/useSekolah'

const authStore = useAuthStore()
const { logout } = useAuthService()
const admin = useAdminService()
const route = useRoute()
const { sekolah } = useSekolah()

// Pattern header dari image yang diunggah (Pengaturan → Logo & Identitas).
// Kosong → pakai garis diagonal bawaan dari CSS.
const patternStyle = computed(() =>
  sekolah.value.patternHeader
    ? {
        backgroundImage: `url('${sekolah.value.patternHeader}')`,
        backgroundRepeat: 'repeat',
        backgroundSize: '40px'
      }
    : undefined
)

const sidebarOpen = ref(false)

// ===== Notifikasi =====
const notifOpen = ref(false)
const notifs = ref<AppNotification[]>([])
const unreadCount = ref(0)

async function loadNotifications() {
  try {
    const res = await admin.notifications.list()
    notifs.value = res.data
    unreadCount.value = res.unread_count
  } catch {
    // abaikan error — badge hanya tidak muncul
  }
}

// Polling ringan: muat ulang notifikasi tiap 30 detik agar staff melihat
// jadwal baru tanpa harus reload halaman.
let pollTimer: ReturnType<typeof setInterval> | null = null
function startPolling() {
  stopPolling()
  pollTimer = setInterval(loadNotifications, 30000)
}
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function markAllRead() {
  try {
    await admin.notifications.markAllRead()
    notifs.value = notifs.value.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    unreadCount.value = 0
  } catch {
    // abaikan
  }
}

function openNotification(n: AppNotification) {
  if (!n.read_at) {
    admin.notifications.markRead(n.id).catch(() => {})
    n.read_at = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  notifOpen.value = false
  navigateTo('/staff/maintenance')
}

// Tutup dropdown saat klik di luar
function onClickOutside(e: Event) {
  const el = e.target as HTMLElement
  if (!el.closest('[data-notif]')) notifOpen.value = false
}

onMounted(() => {
  loadNotifications()
  startPolling()
  document.addEventListener('click', onClickOutside)
})
onActivated(() => {
  loadNotifications()
  startPolling()
})
onDeactivated(stopPolling)
onUnmounted(() => {
  stopPolling()
  document.removeEventListener('click', onClickOutside)
})

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

// Role aktif ditentukan dari path (mis. /kaproli/... → kaproli, /staff/... → staff_sarpras)
// agar user double job melihat menu sesuai dashboard yang sedang dibuka.
const activeRole = computed(() => {
  const seg = route.path.split('/')[1]
  if (seg === 'kaproli') return 'kaproli'
  if (seg === 'staff') return 'staff_sarpras'
  return authStore.role ?? 'staff_sarpras'
})

const nav = computed(() => navMap[activeRole.value] ?? navMap.staff_sarpras)
const pageTitle = computed(() => (route.meta.title as string | undefined) || 'Dashboard')

// Primary bar: kartu navigasi modul di atas konten (gaya Skoria) — ikut role aktif
// Setiap kartu adalah halaman daun berbeda → tanpa activePrefix (exact match).
const quickNav = computed(() => nav.value ?? [])

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
          <div class="text-xs text-gray-400 capitalize">{{ activeRole.replace('_', ' ') }}</div>
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
            <div class="text-xs text-gray-400 capitalize">{{ (authStore.roles[0] ?? authStore.role)?.replace('_', ' ') }}</div>
          </div>
          <button class="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition" title="Keluar" @click="handleLogout">
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="md:pl-64 flex flex-col min-h-screen">
      <div class="sticky top-0 z-20">
        <!-- Pita merah-putih ala bendera di atas header (tetap ada saat scroll) -->
        <div class="stripe-merah-putih" />
        <header
          class="h-16 bg-white header-pattern border-b border-gray-200 flex items-center gap-4 px-4 lg:px-8"
          :style="patternStyle"
        >
        <button class="md:hidden p-2 rounded-lg hover:bg-gray-100" @click="sidebarOpen = true">
          <Menu class="w-5 h-5" />
        </button>
        <div class="flex-1">
          <h1 class="text-sm font-semibold text-gray-900">{{ pageTitle }}</h1>
        </div>

        <!-- Role switcher: pindah dashboard antar peran (double job) -->
        <RoleSwitcher class="mr-1" />

        <!-- Switch mode tampilan (Default / Terang / Gelap) -->
        <ThemeSwitcher class="mr-1" />

        <!-- Bell notifikasi -->
        <div class="relative" data-notif>
          <button
            class="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
            title="Notifikasi"
            @click.stop="notifOpen = !notifOpen"
          >
            <Bell class="w-5 h-5" />
            <span
              v-if="unreadCount > 0"
              class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
            >
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </button>

          <div
            v-if="notifOpen"
            class="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50"
          >
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div class="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Bell class="w-4 h-4 text-emerald-600" />
                Notifikasi
              </div>
              <button
                v-if="unreadCount > 0"
                class="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                @click.stop="markAllRead"
              >
                <CheckCheck class="w-3.5 h-3.5" />
                Tandai dibaca
              </button>
            </div>

            <div class="max-h-80 overflow-y-auto divide-y divide-gray-50">
              <button
                v-for="n in notifs"
                :key="n.id"
                class="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3"
                @click="openNotification(n)"
              >
                <div class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" :class="n.read_at ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-600'">
                  <CalendarClock class="w-4 h-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-gray-900 truncate">
                    {{ n.data?.barang ?? 'Jadwal maintenance' }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ n.data?.message ?? 'Jadwal maintenance baru.' }}
                    <template v-if="n.data?.tanggal_jadwal">• {{ n.data.tanggal_jadwal }}</template>
                  </div>
                  <div class="text-2xs text-gray-400 mt-0.5">
                    {{ n.created_at ? new Date(n.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '' }}
                  </div>
                </div>
                <span v-if="!n.read_at" class="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
              </button>
              <div v-if="!notifs.length" class="px-4 py-8 text-center text-sm text-gray-400">
                Belum ada notifikasi.
              </div>
            </div>
          </div>
        </div>
      </header>
      </div>

      <!-- Primary bar: kartu navigasi modul di atas konten (bukan bagian header) -->
      <QuickNavBar :items="quickNav" />
      <main class="flex-1 p-4 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
