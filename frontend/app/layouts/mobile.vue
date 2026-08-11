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
  ShieldCheck,
  ChevronLeft,
  User
} from 'lucide-vue-next'
import { useAuthService } from '~/services/api/auth'
import { useSekolah } from '~/composables/useSekolah'

const authStore = useAuthStore()
const { logout } = useAuthService()
const { sekolah } = useSekolah()
const route = useRoute()

// Pattern header dari Pengaturan → Logo & Identitas (opsional, fallback polos)
const patternStyle = computed(() =>
  sekolah.value.patternHeader
    ? {
        backgroundImage: `url('${sekolah.value.patternHeader}')`,
        backgroundRepeat: 'repeat',
        backgroundSize: '40px'
      }
    : undefined
)

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

// Role aktif ditentukan dari path (mis. /guru/... → guru, /kepsek/... → kepsek)
// agar user double job melihat menu sesuai dashboard yang sedang dibuka.
const activeRole = computed(() => {
  const seg = route.path.split('/')[1]
  if (seg === 'murid') return 'murid'
  if (seg === 'kepsek') return 'kepsek'
  if (seg === 'guru') return 'guru'
  return authStore.role ?? 'guru'
})

const nav = computed(() => navMap[activeRole.value] ?? navMap.guru)
const pageTitle = computed(() => (route.meta.title as string | undefined) || 'Beranda')

// Halaman profil sesuai role aktif (layout mobile hanya dipakai guru/murid/kepsek)
const profilePath = computed(() => {
  const r = activeRole.value
  return r === 'murid' || r === 'kepsek' || r === 'guru' ? `/${r}/profil` : '/guru/profil'
})

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
    <!-- Garis merah-putih 1px full width (identitas instansi) -->
    <div class="stripe-merah-putih" />

    <!-- Bar identitas sekolah (tipis, formal) -->
    <div class="h-7 flex items-center gap-1.5 px-4" style="background-color: #1D4ED8;" :style="patternStyle">
      <img
        v-if="sekolah.fotoAplikasi"
        :src="sekolah.fotoAplikasi"
        class="w-3.5 h-3.5 object-contain shrink-0"
        alt="Logo sekolah"
      />
      <ShieldCheck v-else class="w-3 h-3 text-white/80 shrink-0" />
      <span class="text-2xs font-medium text-white/80 truncate">{{ sekolah.nama }}</span>
      <div class="flex-1" />
      <RoleSwitcher />
      <ThemeSwitcher tone="light" />
      <button class="p-0.5 rounded text-white/60 hover:text-white transition" title="Keluar" @click="handleLogout">
        <LogOut class="w-3 h-3" />
      </button>
    </div>

    <!-- Header : judul halaman + nama aplikasi -->
    <header class="h-12 bg-white flex items-center gap-2 px-4 sticky top-0 z-10" style="border-bottom: 1px solid var(--app-border-light, #E5E7EB);">
      <h1 class="font-display text-sm font-semibold truncate" style="color: var(--app-text, #0F172A);">{{ pageTitle }}</h1>
      <div class="flex-1" />
      <span class="text-2xs" style="color: var(--app-faint, #9CA3AF);">{{ sekolah.namaAplikasi }}</span>
      <!-- Avatar profil (klik → halaman profil role aktif) -->
      <NuxtLink
        :to="profilePath"
        class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden transition"
        title="Profil saya"
        :style="{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }"
      >
        <img v-if="authStore.user?.foto" :src="authStore.user.foto" class="w-full h-full object-cover" alt="Profil" />
        <User v-else class="w-4 h-4" style="color: #1D4ED8;" />
      </NuxtLink>
    </header>

    <!-- Konten -->
    <main class="flex-1 p-3 pb-20 space-y-3">
      <slot />
    </main>

    <!-- Bottom nav (boxed) -->
    <nav
      class="h-14 fixed bottom-0 left-0 right-0 max-w-md mx-auto flex items-stretch z-10"
      style="background-color: var(--app-surface, #ffffff); border-top: 1px solid var(--app-border, #D1D5DB);"
    >
      <NuxtLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition relative"
        :style="isActive(item.to) ? { color: '#1D4ED8' } : { color: '#9CA3AF' }"
      >
        <component :is="item.icon" class="w-5 h-5" />
        <span>{{ item.title }}</span>
        <span
          v-if="isActive(item.to)"
          class="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b"
          style="background-color: #1D4ED8;"
        />
      </NuxtLink>
    </nav>
  </div>
</template>
