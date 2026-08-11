<script setup lang="ts">
import { ref } from 'vue'
import { useAuthService } from '~/services/api/auth'
import { useSekolah } from '~/composables/useSekolah'
import { ShieldCheck, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-vue-next'
import type { UserRole } from '~/stores/auth'

definePageMeta({ middleware: ['guest'] })

const authStore = useAuthStore()
const { login } = useAuthService()
const { sekolah } = useSekolah()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const showPassword = ref(false)
const remember = ref(false)
const forgotHint = ref(false)

/** Fokus input → border biru + shadow */
function onInputFocus(e: FocusEvent) {
  const el = e.currentTarget as HTMLInputElement
  el.style.borderColor = '#1D4ED8'
  el.style.boxShadow = '0 0 0 2px rgba(29,78,216,0.15)'
  el.style.backgroundColor = '#ffffff'
}

/** Lepas fokus input → kembali normal */
function onInputBlur(e: FocusEvent) {
  const el = e.currentTarget as HTMLInputElement
  el.style.borderColor = '#D1D5DB'
  el.style.boxShadow = 'none'
  el.style.backgroundColor = '#F9FAFB'
}

async function submit() {
  if (loading.value) return
  error.value = null
  forgotHint.value = false
  loading.value = true

  try {
    const res = await login({ email: email.value, password: password.value })
    authStore.setSession(res.token, res.user, res.role as UserRole, (res.roles ?? [res.role]) as UserRole[])
    await navigateTo(rolesHome(res.roles ?? [res.role]))
  } catch (e: any) {
    error.value = e?.data?.errors?.email?.[0] ?? 'Email atau password salah.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center p-4 sm:p-6"
    style="background-color: #EEF0F3;"
  >
    <!-- Pola titik halus di latar -->
    <div
      class="fixed inset-0 pointer-events-none"
      style="background-image: radial-gradient(circle at 1px 1px, rgba(29,78,216,0.06) 1px, transparent 1px); background-size: 24px 24px;"
    />

    <!-- Kartu split ala referensi -->
    <div
      class="relative w-full max-w-4xl grid md:grid-cols-2 overflow-hidden"
      style="border: 1px solid #D1D5DB; border-radius: 16px; box-shadow: 0 20px 50px rgba(15,23,42,0.12); background-color: #ffffff;"
    >
      <!-- ===== Panel kiri: branding (desktop) ===== -->
      <div
        class="hidden md:flex flex-col relative p-8 lg:p-10 text-white"
        style="background: linear-gradient(160deg, #1D4ED8 0%, #2563EB 55%, #3B82F6 100%);"
      >
        <div
          class="absolute inset-0 opacity-[0.07]"
          style="background-image: radial-gradient(circle at 25% 25%, #ffffff 1px, transparent 1px), radial-gradient(circle at 75% 75%, #ffffff 1px, transparent 1px); background-size: 40px 40px;"
        />

        <div class="relative z-10 flex items-center gap-3">
          <div class="logo-plate w-11 h-11 rounded-lg flex items-center justify-center overflow-hidden">
            <img
              v-if="sekolah.fotoSekolah"
              :src="sekolah.fotoSekolah"
              class="w-8 h-8 object-contain"
              alt="Logo sekolah"
            />
            <ShieldCheck v-else class="w-5 h-5" style="color: #FBBF24;" />
          </div>
          <div class="min-w-0">
            <div class="font-display text-sm font-bold truncate">{{ sekolah.nama }}</div>
            <div class="text-xs" style="color: #BFDBFE;">{{ sekolah.alamat?.split(',')[0] ?? 'Kota Bandung' }}</div>
          </div>
        </div>

        <div class="relative z-10 flex-1 flex flex-col justify-center py-10">
          <h1 class="font-display text-2xl font-bold leading-snug">
            Kelola aset sekolah<br />lebih rapi &amp; transparan.
          </h1>
          <p class="text-sm mt-3 leading-relaxed" style="color: #DBEAFE;">
            {{ sekolah.namaAplikasi }} membantu mengelola sarana prasarana, peminjaman barang, pelaporan kerusakan, dan penjadwalan maintenance dalam satu sistem terpadu.
          </p>

          <ul class="mt-8 space-y-3">
            <li
              v-for="f in ['Kelola aset & inventaris', 'Peminjaman barang mudah', 'Laporan & maintenance']"
              :key="f"
              class="flex items-center gap-2.5 text-sm"
            >
              <CheckCircle2 class="w-4 h-4 shrink-0" style="color: #FBBF24;" />
              <span>{{ f }}</span>
            </li>
          </ul>
        </div>

        <p class="relative z-10 text-2xs" style="color: rgba(255,255,255,0.55);">
          Aplikasi ini dikembangkan oleh PT. Tristek Media Kreasindo @ 2017 - 2026
        </p>
      </div>

      <!-- ===== Panel kanan: form login ===== -->
      <div class="p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
        <!-- Header mobile -->
        <div class="md:hidden flex items-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" style="background-color: #1D4ED8;">
            <ShieldCheck class="w-5 h-5 text-white" />
          </div>
          <div>
            <div class="font-display text-sm font-bold" style="color: #0F172A;">{{ sekolah.nama }}</div>
            <div class="text-xs" style="color: #6B7280;">{{ sekolah.namaAplikasi }}</div>
          </div>
        </div>

        <h2 class="font-display text-xl font-bold" style="color: #0F172A;">Masuk</h2>
        <p class="text-sm mt-1 mb-6" style="color: #6B7280;">Silakan masuk menggunakan akun Anda.</p>

        <!-- Banner mode pemeliharaan -->
        <div
          v-if="sekolah.modePemeliharaan"
          class="flex items-start gap-2.5 px-4 py-3 rounded-md text-xs mb-4"
          style="border: 1px solid #FDE68A; background-color: #FFFBEB;"
        >
          <ShieldCheck class="w-4 h-4 shrink-0 mt-0.5" style="color: #D97706;" />
          <div>
            <div class="font-semibold" style="color: #92400E;">Mode Pemeliharaan Aktif</div>
            <div class="mt-0.5 leading-relaxed" style="color: #B45309;">
              Sistem sedang dalam pemeliharaan. Beberapa layanan mungkin tidak tersedia sementara.
            </div>
          </div>
        </div>

        <form class="space-y-5" @submit.prevent="submit">
          <!-- Error -->
          <div
            v-if="error"
            class="flex items-center gap-2 px-4 py-3 rounded-md text-xs font-medium"
            style="border: 1px solid #FECACA; background-color: #FEF2F2; color: #DC2626;"
          >
            <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
            {{ error }}
          </div>

          <!-- Email -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold" style="color: #374151;">Email</label>
            <div class="relative">
              <div class="absolute left-3 top-1/2 -translate-y-1/2" style="color: #9CA3AF;">
                <Mail class="w-4 h-4" />
              </div>
              <input
                id="email"
                v-model="email"
                type="email"
                autocomplete="email"
                required
                placeholder="nama@email.com"
                class="w-full rounded-md outline-none pl-10 pr-3 py-2.5 text-sm transition"
                style="border: 1px solid #D1D5DB; color: #0F172A; background-color: #F9FAFB;"
                @focus="onInputFocus"
                @blur="onInputBlur"
              />
            </div>
          </div>

          <!-- Kata sandi -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold" style="color: #374151;">Kata Sandi</label>
            <div class="relative">
              <div class="absolute left-3 top-1/2 -translate-y-1/2" style="color: #9CA3AF;">
                <Lock class="w-4 h-4" />
              </div>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                placeholder="Masukkan kata sandi"
                class="w-full rounded-md outline-none pl-10 pr-10 py-2.5 text-sm transition"
                style="border: 1px solid #D1D5DB; color: #0F172A; background-color: #F9FAFB;"
                @focus="onInputFocus"
                @blur="onInputBlur"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2"
                style="color: #9CA3AF;"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="!showPassword" class="w-4 h-4" />
                <EyeOff v-else class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Ingat saya + Lupa kata sandi -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <input
                id="remember"
                v-model="remember"
                type="checkbox"
                class="w-4 h-4 rounded"
                style="border-color: #D1D5DB; accent-color: #1D4ED8;"
              />
              <label for="remember" class="text-xs" style="color: #6B7280; cursor: pointer;">Ingat saya</label>
            </div>
            <button
              type="button"
              class="text-xs font-semibold transition hover:underline"
              style="color: #1D4ED8;"
              @click="forgotHint = !forgotHint"
            >
              Lupa kata sandi?
            </button>
          </div>

          <p
            v-if="forgotHint"
            class="text-xs leading-relaxed rounded-md px-3 py-2"
            style="border: 1px solid #BFDBFE; background-color: #EFF6FF; color: #1E40AF;"
          >
            Hubungi administrator sekolah untuk mereset kata sandi Anda.
          </p>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-md py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
            style="background-color: #1D4ED8; border: 1px solid #1D4ED8;"
            @mouseover="($event.currentTarget as HTMLElement).style.backgroundColor = '#1E40AF'"
            @mouseout="($event.currentTarget as HTMLElement).style.backgroundColor = '#1D4ED8'"
          >
            <span v-if="loading" class="inline-flex items-center gap-2">
              <svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Memproses…
            </span>
            <span v-else>Masuk</span>
          </button>
        </form>

        <!-- Demo info -->
        <p class="mt-6 text-center text-2xs" style="color: #9CA3AF;">
          Demo: admin@example.com / password
        </p>
      </div>
    </div>
  </div>
</template>
