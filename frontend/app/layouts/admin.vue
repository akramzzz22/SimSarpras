<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import type { Component } from 'vue'
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
  KeyRound,
  Bell,
  CheckCheck,
  ShieldCheck,
  Megaphone,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ImageIcon,
  CalendarDays,
  Plus,
  PackagePlus,
  PackageMinus,
  History,
  DoorOpen,
  AlertTriangle,
  Inbox,
  Receipt,
  Coins,
  FolderTree,
  Gauge,
  CircleDot,
  Ruler,
  Briefcase,
  User
} from 'lucide-vue-next'
import { useAuthService } from '~/services/api/auth'
import { useAdminService, type AppNotification } from '~/services/api/admin'
import { useSekolah } from '~/composables/useSekolah'
import { primaryRole } from '~/utils/roles'

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

const authStore = useAuthStore()
const { logout } = useAuthService()
const admin = useAdminService()
const route = useRoute()

const sidebarOpen = ref(false)

// Sidebar desktop bisa disembunyikan / dimunculkan (seperti bar promosi)
const sidebarCollapsed = ref(false)

// Top bar (promosi) bisa disembunyikan / dimunculkan
const topbarOpen = ref(true)

// ============ STRUKTUR MODUL (satu sumber kebenaran) ============
// Primary bar menampilkan modul; sidebar hanya menampilkan children
// dari modul yang sedang aktif — sehingga sidebar tidak lagi penuh/panjang.
interface Module {
  title: string
  icon: Component
  /** Halaman default modul (dipakai primary bar & item tunggal di sidebar). */
  to: string
  /** Prefiks path milik modul (untuk menentukan modul aktif). */
  prefix?: string[]
  children?: { title: string; to: string; icon: Component }[]
}

const modules: Module[] = [
  { title: 'Dashboard', icon: LayoutDashboard, to: '/admin' },
  {
    title: 'Inventaris',
    icon: Boxes,
    to: '/admin/asset/data-barang',
    prefix: ['/admin/asset'],
    children: [
      { title: 'Semua Barang', to: '/admin/asset/data-barang', icon: Boxes },
      { title: 'Tambah Barang', to: '/admin/asset/data-barang?tambah=1', icon: Plus },
      { title: 'Barang Masuk', to: '/admin/asset/barang-masuk', icon: PackagePlus },
      { title: 'Barang Keluar', to: '/admin/asset/barang-keluar', icon: PackageMinus },
      { title: 'Mutasi Barang', to: '/admin/asset/mutasi-barang', icon: ArrowLeftRight },
      { title: 'Riwayat Barang', to: '/admin/asset/riwayat-barang', icon: History },
      { title: 'QR Code', to: '/admin/asset/qr-code', icon: QrCode }
    ]
  },
  {
    title: 'Peminjaman',
    icon: ClipboardCheck,
    to: '/admin/peminjaman/semua',
    prefix: ['/admin/peminjaman'],
    children: [
      { title: 'Semua Peminjaman', to: '/admin/peminjaman/semua', icon: ClipboardList },
      { title: 'Pengajuan', to: '/admin/peminjaman/approval', icon: Inbox },
      { title: 'Sedang Dipinjam', to: '/admin/peminjaman/sedang-dipinjam', icon: PackageCheck },
      { title: 'Terlambat', to: '/admin/peminjaman/terlambat', icon: AlertTriangle },
      { title: 'Riwayat', to: '/admin/peminjaman/riwayat', icon: History },
      { title: 'Pengembalian', to: '/admin/peminjaman/pengembalian', icon: PackageCheck },
      { title: 'Jadwal Booking', to: '/admin/peminjaman/jadwal-booking', icon: CalendarClock }
    ]
  },
  {
    title: 'Pelaporan',
    icon: AlertTriangle,
    to: '/admin/maintenance/laporan-kerusakan',
    prefix: ['/admin/maintenance/laporan-kerusakan'],
    children: [
      { title: 'Semua Laporan', to: '/admin/maintenance/laporan-kerusakan', icon: FileText },
      { title: 'Laporan Baru', to: '/admin/maintenance/laporan-kerusakan?status=menunggu', icon: Inbox },
      { title: 'Diproses', to: '/admin/maintenance/laporan-kerusakan?status=diverifikasi,diperbaiki', icon: Wrench },
      { title: 'Riwayat', to: '/admin/maintenance/laporan-kerusakan?status=selesai', icon: History }
    ]
  },
  {
    title: 'Maintenance',
    icon: Wrench,
    to: '/admin/maintenance/dashboard',
    prefix: ['/admin/maintenance'],
    children: [
      { title: 'Dashboard Maintenance', to: '/admin/maintenance/dashboard', icon: LayoutDashboard },
      { title: 'Pekerjaan', to: '/admin/maintenance/penugasan', icon: ClipboardList },
      { title: 'Jadwal', to: '/admin/maintenance/jadwal', icon: CalendarClock },
      { title: 'Teknisi', to: '/admin/maintenance/teknisi', icon: Users },
      { title: 'Riwayat', to: '/admin/maintenance/riwayat', icon: History },
      { title: 'Vendor', to: '/admin/maintenance/vendor', icon: Store }
    ]
  },
  { title: 'Kalender', icon: CalendarDays, to: '/admin/kalender' },
  {
    title: 'Laporan',
    icon: FileText,
    to: '/admin/laporan',
    prefix: ['/admin/laporan'],
    children: [
      { title: 'Inventaris', to: '/admin/laporan/inventaris', icon: Boxes },
      { title: 'Peminjaman', to: '/admin/laporan/peminjaman', icon: ClipboardCheck },
      { title: 'Kerusakan', to: '/admin/laporan/kerusakan', icon: AlertTriangle },
      { title: 'Maintenance', to: '/admin/laporan/maintenance', icon: Wrench },
      { title: 'Pengeluaran', to: '/admin/laporan/pengeluaran', icon: Receipt }
    ]
  },
  {
    title: 'Master Data',
    icon: Database,
    to: '/admin/master-data/kategori-barang',
    prefix: ['/admin/master-data'],
    children: [
      { title: 'Kategori Barang', to: '/admin/master-data/kategori-barang', icon: FolderTree },
      { title: 'Satuan', to: '/admin/master-data/satuan', icon: Ruler },
      { title: 'Kondisi Barang', to: '/admin/master-data/kondisi-barang', icon: CircleDot },
      { title: 'Status Barang', to: '/admin/master-data/status-barang', icon: Gauge },
      { title: 'Jenis Kerusakan', to: '/admin/master-data/jenis-kerusakan', icon: AlertTriangle },
      { title: 'Tingkat Kerusakan', to: '/admin/master-data/tingkat-kerusakan', icon: Gauge },
      { title: 'Jenis Maintenance', to: '/admin/master-data/jenis-maintenance', icon: Wrench },
      { title: 'Sumber Dana', to: '/admin/master-data/sumber-dana', icon: Coins },
      { title: 'Supplier', to: '/admin/master-data/vendor', icon: Store },
      { title: 'Jurusan', to: '/admin/master-data/jurusan', icon: GraduationCap },
      { title: 'Gedung', to: '/admin/master-data/gedung', icon: Building2 },
      { title: 'Ruangan', to: '/admin/master-data/ruangan', icon: DoorOpen },
      { title: 'Murid', to: '/admin/master-data/murid', icon: Users },
      { title: 'PTK', to: '/admin/master-data/ptk', icon: UserCog },
      { title: 'Kelas', to: '/admin/master-data/kelas', icon: GraduationCap },
      { title: 'Proli', to: '/admin/master-data/proli', icon: Briefcase }
    ]
  },
  {
    title: 'Pengguna & Akses',
    icon: Users,
    to: '/admin/user',
    prefix: ['/admin/user', '/admin/pengaturan/role', '/admin/pengaturan/permission'],
    children: [
      { title: 'Semua Pengguna', to: '/admin/user', icon: Users },
      { title: 'Role', to: '/admin/pengaturan/role', icon: ShieldCheck },
      { title: 'Permission', to: '/admin/pengaturan/permission', icon: KeyRound },
      { title: 'User Murid', to: '/admin/user/murid', icon: GraduationCap },
      { title: 'User PTK', to: '/admin/user/ptk', icon: UserCog }
    ]
  },
  {
    title: 'Pengaturan',
    icon: Settings,
    to: '/admin/pengaturan',
    prefix: ['/admin/pengaturan', '/admin/profil'],
    children: [
      { title: 'Profil Sekolah', to: '/admin/pengaturan/logo', icon: ImageIcon },
      { title: 'Profil Saya', to: '/admin/profil', icon: User },
      { title: 'Pengaturan Sistem', to: '/admin/pengaturan', icon: Settings },
      { title: 'Log Aktivitas', to: '/admin/pengaturan/log-aktivitas', icon: History },
      { title: 'Tahun Ajaran', to: '/admin/pengaturan/tahun-ajaran', icon: CalendarDays }
    ]
  }
]

// Primary bar (kartu modul di atas konten)
const quickNav = modules.map((m) => ({
  title: m.title,
  to: m.to,
  icon: m.icon,
  activePrefix: m.prefix
}))

/** Panjang prefix terpanjang sebuah modul (untuk memilih modul paling spesifik). */
function modulePrefixLen(m: Module): number {
  return Math.max(0, ...(m.prefix ?? []).map((p) => p.length))
}

/** Modul aktif: exact match untuk modul tanpa prefix, else prefix paling spesifik. */
const activeModule = computed<Module>(() => {
  const exact = modules.find((m) => !m.prefix?.length && route.path === m.to)
  if (exact) return exact
  const matches = modules.filter((m) => m.prefix?.some((p) => route.path.startsWith(p)))
  if (!matches.length) return modules[0]!
  return matches.sort((a, b) => modulePrefixLen(b) - modulePrefixLen(a))[0]!
})

/** Item yang tampil di sidebar = children modul aktif; tanpa children → item tunggal. */
const sidebarItems = computed(() => {
  const m = activeModule.value
  return m.children?.length ? m.children : [{ title: m.title, to: m.to, icon: m.icon }]
})

/** Pecah target link menjadi path + query. */
function parseTo(to: string) {
  const [path, qs] = to.split('?')
  return { path, params: new URLSearchParams(qs ?? '') }
}

/**
 * Link aktif di sidebar. Link ber-query cocok bila path & seluruh query-nya sama.
 * Link tanpa query aktif bila path cocok dan tidak ada link ber-query lain yang
 * lebih spesifik aktif (hindari dobel highlight pada modul Pelaporan dkk).
 */
function linkActive(to: string, siblings: { to: string }[]): boolean {
  const { path, params } = parseTo(to)
  if (route.path !== path) return false
  for (const [k, v] of params.entries()) {
    if (String(route.query[k] ?? '') !== v) return false
  }
  if (params.size === 0) {
    const adaQueryLinkAktif = siblings.some((s) => {
      const q2 = parseTo(s.to).params
      if (q2.size === 0) return false
      for (const [k, v] of q2.entries()) {
        if (String(route.query[k] ?? '') !== v) return false
      }
      return true
    })
    if (adaQueryLinkAktif) return false
  }
  return true
}

const activeChild = computed(() =>
  (activeModule.value.children ?? []).find((c) => linkActive(c.to, activeModule.value.children ?? []))
)

// Label peran user (mis. "admin" → "Administrator") — pakai role utama dari roles[]
const roleLabel = computed(() => {
  const r = primaryRole(authStore.roles).replace('_', ' ')
  return r === 'admin' ? 'Administrator' : r.charAt(0).toUpperCase() + r.slice(1)
})

const breadcrumb = computed(() => {
  const segs = ['Admin']
  const m = activeModule.value
  if (m.title !== 'Dashboard') segs.push(m.title)
  if (activeChild.value) segs.push(activeChild.value.title)
  return segs
})

// ---- Notifikasi ----
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
  navigateTo('/admin/maintenance/jadwal')
}

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

// Hover keluar → merah
function onLogoutEnter(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  if (el) el.style.color = '#DC2626'
}
function onLogoutLeave(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  if (el) el.style.color = '#6B7280'
}

// Klik breadcrumb di konten → tutup/buka sidebar (desktop: collapse; mobile: drawer)
function toggleSidebar() {
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    sidebarCollapsed.value = !sidebarCollapsed.value
  } else {
    sidebarOpen.value = !sidebarOpen.value
  }
}

// Tutup drawer mobile saat berpindah halaman
watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  }
)
</script>

<template>
  <div class="admin-app min-h-screen" style="background-color: var(--app-bg, #F8F9FA);">
    <!-- Overlay mobile -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/40 z-40 lg:hidden"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar dinamis: hanya menampilkan submenu modul aktif (tidak lagi penuh/panjang) -->
    <aside
      class="fixed left-0 z-40 w-64 border-r flex flex-col transform transition-transform duration-200 top-0 bottom-0 lg:top-[var(--header-h)]"
      style="border-right-color: var(--app-border, #D1D5DB); border-right-width: 1px; background-color: var(--app-surface, #ffffff);"
      :class="[
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        sidebarCollapsed ? 'lg:-translate-x-full' : 'lg:translate-x-0'
      ]"
      :style="{ '--header-h': topbarOpen ? '112px' : '80px' }"
    >
      <!-- Label modul aktif -->
      <div class="h-16 flex items-center gap-3 px-5" style="border-bottom: 1px solid var(--app-border-light, #E5E7EB);">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background-color: #EFF6FF;">
          <component :is="activeModule.icon" class="w-4 h-4" style="color: #1D4ED8;" />
        </div>
        <span class="text-xs font-bold uppercase tracking-widest truncate" style="color: #374151;">
          {{ activeModule.title }}
        </span>
        <button class="ml-auto lg:hidden text-gray-400" @click="sidebarOpen = false">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Nav: submenu modul aktif saja -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <NuxtLink
          v-for="item in sidebarItems"
          :key="item.to"
          :to="item.to"
          class="relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition"
          :class="linkActive(item.to, sidebarItems) ? 'text-white font-semibold' : 'text-gray-600 hover:bg-gray-100'"
          :style="linkActive(item.to, sidebarItems) ? { backgroundColor: '#1D4ED8', color: '#ffffff' } : {}"
        >
          <span
            v-if="linkActive(item.to, sidebarItems)"
            class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full"
            style="background-color: #1D4ED8;"
          />
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          <span class="truncate">{{ item.title }}</span>
        </NuxtLink>
      </nav>

      <!-- User + Logout -->
      <div class="p-3" style="border-top: 1px solid var(--app-border-light, #E5E7EB); background-color: var(--app-bg, #F8F9FA);">
        <div class="flex items-center gap-3 px-2 py-2">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white overflow-hidden" style="background-color: #1D4ED8;">
            <img
              v-if="authStore.user?.foto"
              :src="authStore.user.foto"
              class="w-full h-full object-cover"
              alt="Foto profil"
            />
            <span v-else>{{ (authStore.user?.name ?? 'A').charAt(0).toUpperCase() }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-gray-900 truncate">{{ authStore.user?.name ?? 'Admin' }}</div>
            <div class="text-xs text-gray-400 capitalize">{{ primaryRole(authStore.roles).replace('_', ' ') }}</div>
          </div>
          <button
            class="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
            title="Keluar"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Header ala Skoria — FULL WIDTH dari ujung kiri sampai ujung kanan -->
    <div class="sticky top-0 z-30">
        <!-- ============ SATU TOP BAR — brand + promosi + breadcrumb + ikon (bisa di-hide) ============ -->
        <div
          class="overflow-hidden transition-all duration-300 ease-in-out"
          :class="topbarOpen ? 'max-h-9 opacity-100' : 'max-h-0 opacity-0'"
        >
          <div style="background-color: var(--app-bg, #F0F0F0); border-bottom: 1px solid var(--app-border, #D1D5DB);">
            <div class="h-8 flex items-center gap-2 px-3 lg:px-6">
              <!-- Brand aplikasi -->
              <NuxtLink to="/admin" class="flex items-center gap-2 shrink-0" title="Beranda">
                <img v-if="sekolah.fotoAplikasi" :src="sekolah.fotoAplikasi" class="img-instansi w-6 h-6 object-contain shrink-0" alt="Logo aplikasi" />
                <div v-else class="w-6 h-6 rounded flex items-center justify-center shrink-0" style="background-color: #1D4ED8;">
                  <ShieldCheck class="w-4 h-4 text-white" />
                </div>
                <span class="font-display text-sm font-bold whitespace-nowrap" style="color: var(--app-text, #0F172A);">{{ sekolah.namaAplikasi }}</span>
              </NuxtLink>

              <div style="width: 1px; height: 16px; background-color: #CBD5E1; flex-shrink: 0;" />

              <!-- Promosi -->
              <Megaphone class="w-3.5 h-3.5 shrink-0" style="color: #D97706;" />
              <p class="text-2xs font-medium truncate max-w-[26vw] lg:max-w-[32vw]" style="color: #4B5563;">{{ sekolah.pengumuman }}</p>

              <!-- Badge mode pemeliharaan -->
              <span
                v-if="sekolah.modePemeliharaan"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                style="background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A;"
                title="Mode pemeliharaan aktif"
              >
                <ShieldCheck class="w-3 h-3" />
                Pemeliharaan
              </span>

              <div class="flex-1" />

              <!-- Breadcrumb: Admin > Modul > Halaman (item aktif merah) -->
              <nav class="hidden md:flex items-center gap-1.5 text-2xs font-medium text-gray-600 shrink-0" aria-label="Breadcrumb">
                <template v-for="(seg, i) in breadcrumb" :key="i">
                  <ChevronRight v-if="i" class="w-3 h-3 text-gray-400 shrink-0" />
                  <span
                    class="whitespace-nowrap"
                    :class="i === breadcrumb.length - 1 ? 'font-semibold' : 'text-gray-600'"
                    :style="i === breadcrumb.length - 1 ? { color: '#DC2626' } : {}"
                  >{{ seg }}</span>
                </template>
              </nav>

              <!-- Switch mode tampilan (Default / Terang / Gelap) -->
              <ThemeSwitcher />

              <!-- Bell notifikasi -->
              <div class="relative shrink-0" data-notif>
                <button
                  class="relative p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition"
                  title="Notifikasi"
                  @click.stop="notifOpen = !notifOpen"
                >
                  <Bell class="w-4 h-4" />
                  <span
                    v-if="unreadCount > 0"
                    class="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
                    style="background-color: #DC2626;"
                  >
                    {{ unreadCount > 99 ? '99+' : unreadCount }}
                  </span>
                </button>
              </div>

              <!-- Pengaturan -->
              <NuxtLink
                to="/admin/pengaturan"
                class="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition shrink-0"
                title="Pengaturan"
              >
                <Settings class="w-4 h-4" />
              </NuxtLink>

              <!-- Keluar -->
              <button
                class="p-1.5 rounded-md transition shrink-0"
                style="color: #6B7280;"
                title="Keluar"
                @click="handleLogout"
                @mouseenter="onLogoutEnter"
                @mouseleave="onLogoutLeave"
              >
                <LogOut class="w-4 h-4" />
              </button>

              <!-- Chevron: sembunyikan/munculkan bar ini -->
              <button
                class="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-black/5 transition shrink-0"
                :title="topbarOpen ? 'Sembunyikan bar' : 'Tampilkan bar'"
                @click="topbarOpen = !topbarOpen"
              >
                <ChevronUp v-if="topbarOpen" class="w-4 h-4" />
                <ChevronDown v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Dropdown notifikasi — di luar wrapper overflow-hidden agar tidak terpotong -->
        <div
          v-if="notifOpen && topbarOpen"
          class="font-sans fixed right-3 lg:right-6 top-[calc(32px+8px)] w-80 max-w-[90vw] bg-white overflow-hidden z-50"
          style="border: 1px solid #D1D5DB; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
        >
          <div class="flex items-center justify-between px-4 py-3" style="border-bottom: 1px solid #E5E7EB;">
            <div class="flex items-center gap-2 text-sm font-semibold" style="color: #0F172A;">
              <Bell class="w-4 h-4" style="color: #1D4ED8;" />
              Notifikasi
            </div>
            <button
              v-if="unreadCount > 0"
              class="inline-flex items-center gap-1 text-xs font-medium"
              style="color: #1D4ED8;"
              @click.stop="markAllRead"
            >
              <CheckCheck class="w-3.5 h-3.5" />
              Tandai dibaca
            </button>
          </div>

          <div class="max-h-80 overflow-y-auto" style="border-bottom: 1px solid #E5E7EB;">
            <button
              v-for="n in notifs"
              :key="n.id"
              class="w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3"
              @click="openNotification(n)"
            >
              <div class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" :class="n.read_at ? 'bg-gray-100 text-gray-400' : ''" :style="!n.read_at ? { backgroundColor: '#EFF6FF', color: '#1D4ED8' } : {}">
                <CalendarClock class="w-4 h-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium" style="color: #0F172A;">{{ n.data?.barang ?? 'Jadwal maintenance' }}</div>
                <div class="text-xs" style="color: #6B7280;">
                  {{ n.data?.message ?? 'Jadwal maintenance baru.' }}
                  <template v-if="n.data?.tanggal_jadwal">• {{ n.data.tanggal_jadwal }}</template>
                </div>
                <div class="text-2xs" style="color: #9CA3AF; margin-top: 2px;">
                  {{ n.created_at ? new Date(n.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '' }}
                </div>
              </div>
              <span v-if="!n.read_at" class="w-2 h-2 rounded-full shrink-0 mt-2" style="background-color: #DC2626;" />
            </button>
            <div v-if="!notifs.length" class="px-4 py-8 text-center text-sm" style="color: #9CA3AF;">
              Belum ada notifikasi.
            </div>
          </div>
        </div>

        <!-- Pita merah-putih ala bendera — di atas HEADER utama (tetap ada walau top bar ditutup) -->
        <div class="stripe-merah-putih" />

        <!-- ============ MAIN HEADER (putih): profil + identitas instansi ============ -->
        <div class="bg-white relative" style="border-bottom: 1px solid var(--app-border, #D1D5DB);">
          <!-- Pattern dimulai dari batas sidebar (w-64 = 256px) — sejajar dengan batas konten & sidebar -->
          <div
            class="header-pattern absolute top-0 bottom-0 left-0 right-0 lg:left-64"
            :style="patternStyle"
            aria-hidden="true"
          />
          <div class="h-20 relative flex items-center gap-2 px-3 lg:px-6">
            <!-- Hamburger (mobile) -->
            <button class="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-50 text-gray-700 transition" @click="sidebarOpen = true">
              <Menu class="w-5 h-5" />
            </button>

            <!-- Profil user (klik → halaman profil) -->
            <NuxtLink
              to="/admin/profil"
              class="hidden sm:flex items-center gap-2.5 shrink-0 rounded-lg px-1.5 py-1 -mx-1.5 transition hover:bg-gray-500/10"
              title="Lihat profil"
            >
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold text-white overflow-hidden" style="background-color: #1D4ED8;">
                <img v-if="authStore.user?.foto" :src="authStore.user.foto" class="w-full h-full object-cover" alt="Foto profil" />
                <span v-else>{{ (authStore.user?.name ?? 'A').charAt(0).toUpperCase() }}</span>
              </div>
              <div class="leading-tight min-w-0">
                <div class="font-display text-sm font-semibold text-gray-900 truncate max-w-[140px]">{{ authStore.user?.name ?? 'Admin' }}</div>
                <div class="text-2xs text-gray-400">{{ roleLabel }}</div>
              </div>
            </NuxtLink>

            <!-- Bagian kanan header: area di samping profil -->
            <div class="flex-1 min-w-0 h-full flex items-center gap-2">
              <div class="flex-1" />

              <!-- Identitas instansi: teks + logo 14px -->
              <div class="hidden lg:flex items-center gap-2.5 shrink-0">
                <div class="text-right leading-snug text-2xs font-medium text-gray-600">
                  <div>PEMERINTAH PROVINSI JAWA BARAT</div>
                  <div>DINAS PENDIDIKAN</div>
                  <div class="font-bold text-gray-800">{{ sekolah.nama }}</div>
                </div>
                <div class="flex items-center gap-2">
                  <img v-if="sekolah.fotoPemprov" :src="sekolah.fotoPemprov" class="img-instansi w-12 h-12 object-contain" title="Provinsi Jawa Barat" />
                  <div v-else class="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[11px] font-bold text-gray-500 leading-none" title="Provinsi Jawa Barat">PB</div>
                  <img v-if="sekolah.fotoDinas" :src="sekolah.fotoDinas" class="img-instansi w-12 h-12 object-contain" title="Dinas Pendidikan" />
                  <div v-else class="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[11px] font-bold text-gray-500 leading-none" title="Dinas Pendidikan">DD</div>
                  <img v-if="sekolah.fotoSekolah" :src="sekolah.fotoSekolah" class="img-instansi w-12 h-12 object-contain" title="Sekolah" />
                  <div v-else class="w-12 h-12 rounded-full bg-white border border-gray-300 flex items-center justify-center text-[11px] font-bold text-gray-500 leading-none" title="Sekolah">SK</div>
                </div>
              </div>

              <!-- Toggle bar atas (munculkan kembali bila bar di-hide) -->
              <button
                class="lg:hidden p-2 rounded-md transition shrink-0"
                style="color: #9CA3AF;"
                :title="topbarOpen ? 'Sembunyikan bar atas' : 'Tampilkan bar atas'"
                @click="topbarOpen = !topbarOpen"
              >
                <ChevronUp v-if="topbarOpen" class="w-4 h-4" />
                <ChevronDown v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
    </div>

    <!-- Konten utama: di kanan sidebar, di bawah header full-width -->
    <div class="flex flex-col min-h-screen" :class="sidebarCollapsed ? 'lg:pl-0' : 'lg:pl-64'">
      <!-- Primary bar: kartu navigasi modul di atas area konten (bukan bagian header/top bar) -->
      <QuickNavBar :items="quickNav" :active-title="activeModule.title" />
      <main class="flex-1 p-4 lg:p-6">
        <!-- Breadcrumb di dalam konten (pojok kiri atas) — klik untuk tutup/buka sidebar -->
        <button
          type="button"
          class="group inline-flex items-center gap-1.5 text-2xs font-medium transition mb-4 max-w-full whitespace-nowrap"
          style="color: #6B7280;"
          :title="sidebarOpen || !sidebarCollapsed ? 'Tutup sidebar' : 'Buka sidebar'"
          @click="toggleSidebar"
        >
          <ChevronsLeft
            v-if="sidebarOpen || !sidebarCollapsed"
            class="w-3.5 h-3.5 transition -ml-0.5 shrink-0"
            style="color: #9CA3AF;"
          />
          <ChevronsRight v-else class="w-3.5 h-3.5 shrink-0" style="color: #1D4ED8;" />
          <span class="flex items-center gap-1.5 min-w-0 overflow-hidden">
            <template v-for="(seg, i) in breadcrumb" :key="i">
              <ChevronRight v-if="i" class="w-3 h-3 shrink-0" style="color: #D1D5DB;" />
              <span
                :style="i === breadcrumb.length - 1 ? { color: '#DC2626', fontWeight: 600 } : { color: '#6B7280' }"
                :title="seg"
              >{{ seg }}</span>
            </template>
          </span>
        </button>
        <slot />
      </main>

      <!-- Footer ala referensi (kanan bawah) -->
      <footer class="px-4 lg:px-6 py-3 flex items-center justify-end gap-2 text-2xs" style="border-top: 1px solid var(--app-border, #D1D5DB); color: var(--app-faint, #9CA3AF); background-color: var(--app-surface, #ffffff);">
        <span>Aplikasi ini dikembangkan oleh PT. Tristek Media Kreasindo @ 2017 - 2026</span>
        <span style="color: #D1D5DB;">|</span>
        <span class="font-medium" style="color: #6B7280;">Versi 1.0</span>
      </footer>
    </div>
  </div>
</template>
