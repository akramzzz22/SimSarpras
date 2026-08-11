<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Component } from 'vue'
import {
  User,
  Mail,
  Phone,
  MapPin,
  Cake,
  IdCard,
  ShieldCheck,
  LogOut,
  Loader2,
  BadgeCheck,
  VenusAndMars,
  GraduationCap,
  CalendarDays
} from 'lucide-vue-next'
import { useAuthService } from '~/services/api/auth'
import { roleLabelMap } from '~/utils/roles'

// accent harus berupa hex 6 digit (mis. '#1D4ED8') — dipakai untuk membentuk
// warna lembut (hex+alpha) seperti badge/ikon agar konsisten dengan tema layout.
const props = withDefaults(defineProps<{ accent?: string; wide?: boolean }>(), {
  accent: '#1D4ED8',
  wide: false
})
const accent = computed(() => props.accent)

const authStore = useAuthStore()
const { logout } = useAuthService()

const user = computed(() => authStore.user ?? {})

// Semua role user (double job), mis. admin + kaproli
const displayRoles = computed(() => {
  const list = authStore.roles.length ? authStore.roles : authStore.role ? [authStore.role] : []
  return list.map((r) => String(r)).filter(Boolean)
})

function fmtTanggal(v?: string | null): string {
  if (!v) return '-'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return v
  // created_at dari DB berupa UTC — format dengan timeZone UTC agar tidak
  // bergeser 1 hari bila waktu aslinya dekat tengah malam WIB.
  return d.toLocaleDateString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
}

// Baris identitas khas role: murid → NIS/Kelas, PTK/admin → NIP/NUPTK.
// Deteksi lewat daftar role (lebih akurat daripada menebak dari field data).
const isMurid = computed(() => {
  return authStore.roles.includes('murid') || authStore.role === 'murid'
})

// Baris standar SELALU tampil (nilai '-' bila belum terisi) supaya kartu tidak bolong/kosong
const infoRows = computed<{ icon: Component; label: string; value: string }[]>(() => {
  const u = user.value
  const rows: { icon: Component; label: string; value: string }[] = []
  rows.push({ icon: User, label: 'Nama', value: u.name ?? '-' })
  if (u.email) rows.push({ icon: Mail, label: 'Email', value: String(u.email) })
  if (isMurid.value) {
    rows.push({ icon: IdCard, label: 'NIS', value: u.nis ? String(u.nis) : '-' })
    rows.push({ icon: GraduationCap, label: 'Kelas', value: u.kelas ? String(u.kelas) : '-' })
  } else {
    rows.push({ icon: IdCard, label: 'NIP', value: u.nip ? String(u.nip) : '-' })
    rows.push({ icon: BadgeCheck, label: 'NUPTK', value: u.nuptk ? String(u.nuptk) : '-' })
  }
  rows.push({ icon: Phone, label: 'No. HP', value: u.no_hp ? String(u.no_hp) : '-' })
  rows.push({
    icon: VenusAndMars,
    label: 'Jenis Kelamin',
    value: u.jenis_kelamin ? (u.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan') : '-'
  })
  rows.push({ icon: ShieldCheck, label: 'Status Akun', value: u.is_active === false ? 'Nonaktif' : 'Aktif' })
  if (u.tempat_lahir) rows.push({ icon: Cake, label: 'Tempat Lahir', value: String(u.tempat_lahir) })
  if (u.tanggal_lahir) rows.push({ icon: Cake, label: 'Tanggal Lahir', value: fmtTanggal(u.tanggal_lahir) })
  if (u.alamat) rows.push({ icon: MapPin, label: 'Alamat', value: String(u.alamat) })
  rows.push({ icon: CalendarDays, label: 'Anggota Sejak', value: fmtTanggal(u.created_at) })
  return rows
})

const loading = ref(false)

async function handleLogout() {
  loading.value = true
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
  <div class="mx-auto space-y-4" :class="wide ? 'max-w-2xl' : 'max-w-md'">
    <!-- Kartu identitas -->
    <div
      class="rounded-2xl p-6 text-center relative overflow-hidden"
      style="background-color: var(--app-surface, #ffffff); border: 1px solid var(--app-border, #D1D5DB);"
    >
      <div class="header-pattern absolute inset-0 opacity-60" aria-hidden="true" />
      <div class="relative">
        <div
          class="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-white overflow-hidden"
          :style="{ backgroundColor: accent, boxShadow: `0 0 0 4px ${accent}1F` }"
        >
          <img
            v-if="user.foto"
            :src="user.foto"
            class="w-full h-full object-cover"
            alt="Foto profil"
          />
          <span v-else>{{ (user.name ?? 'A').charAt(0).toUpperCase() }}</span>
        </div>
        <h2 class="mt-3 text-base font-bold truncate" style="color: var(--app-text, #0F172A);">
          {{ user.name ?? 'Pengguna' }}
        </h2>
        <div class="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
          <span
            v-for="r in displayRoles"
            :key="r"
            class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded"
            :style="{ backgroundColor: `${accent}14`, color: accent, border: `1px solid ${accent}40` }"
          >
            <ShieldCheck class="w-3.5 h-3.5" />
            {{ roleLabelMap[r] ?? r.replace('_', ' ') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Info profil -->
    <div
      class="rounded-2xl overflow-hidden"
      style="background-color: var(--app-surface, #ffffff); border: 1px solid var(--app-border, #D1D5DB);"
    >
      <div class="px-5 py-3 flex items-center gap-2" style="border-bottom: 1px solid var(--app-border-light, #E5E7EB);">
        <IdCard class="w-4 h-4" :style="{ color: accent }" />
        <span class="text-xs font-bold uppercase tracking-wide" style="color: #374151;">Informasi Akun</span>
      </div>
      <!-- wide: grid 2 kolom (desktop); mobile: 1 kolom -->
      <div :class="wide ? 'grid sm:grid-cols-2' : ''">
        <div
          v-for="(row, i) in infoRows"
          :key="row.label"
          class="px-5 py-4 flex items-start gap-3"
          style="border-bottom: 1px solid var(--app-border-light, #E5E7EB);"
          :style="wide && i % 2 === 1 ? { borderLeft: '1px solid var(--app-border-light, #E5E7EB)' } : {}"
        >
          <div class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center" :style="{ backgroundColor: `${accent}14` }">
            <component :is="row.icon" class="w-4 h-4" :style="{ color: accent }" />
          </div>
          <div class="min-w-0">
            <div class="text-xs" style="color: var(--app-faint, #9CA3AF);">{{ row.label }}</div>
            <div
              class="text-sm font-medium break-words"
              :style="row.value === '-' ? { color: 'var(--app-faint, #9CA3AF)' } : { color: 'var(--app-text, #0F172A)' }"
            >{{ row.value }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Keluar -->
    <button
      class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60"
      style="background-color: #FEF2F2; color: #DC2626; border: 1px solid #FECACA;"
      :disabled="loading"
      @click="handleLogout"
    >
      <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
      <LogOut v-else class="w-4 h-4" />
      Keluar
    </button>
  </div>
</template>
