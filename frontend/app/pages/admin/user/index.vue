<script setup lang="ts">
import { KeyRound, UserCog, ChevronRight, Users } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'User' })

const kategori = [
  {
    title: 'User Murid',
    desc: 'Kelola akun login peserta didik — buat, lihat/reset password, aktif/nonaktifkan akun.',
    to: '/admin/user/murid',
    icon: KeyRound,
    cls: 'bg-amber-50 text-amber-600'
  },
  {
    title: 'User PTK',
    desc: 'Kelola akun login Pendidik & Tenaga Kependidikan (guru, kaproli, staf sarpras, kepsek).',
    to: '/admin/user/ptk',
    icon: UserCog,
    cls: 'bg-blue-50 text-blue-600'
  }
]
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-sm font-bold text-gray-900">User</h2>
      <p class="text-sm text-gray-500 mt-1">Kelola akun login pengguna aplikasi.</p>
    </div>

    <div class="grid sm:grid-cols-2 gap-4">
      <NuxtLink
        v-for="k in kategori"
        :key="k.title"
        :to="k.to"
        class="group bg-white p-5 transition"
        style="border: 1px solid #D1D5DB; border-radius: 8px;"
      >
        <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" :class="k.cls">
          <component :is="k.icon" class="w-5 h-5" />
        </div>
        <div class="mt-3 font-semibold" style="color: #0F172A; display: flex; align-items: center; gap: 4px;">
          {{ k.title }}
          <ChevronRight class="w-3.5 h-3.5" style="color: #D1D5DB;" />
        </div>
        <p class="mt-1 text-xs leading-relaxed" style="color: #6B7280;">{{ k.desc }}</p>
      </NuxtLink>
    </div>

    <div class="flex items-center gap-2 px-4 py-3 text-xs" style="border: 1px solid #E5E7EB; border-radius: 8px; background-color: #ffffff; color: #6B7280;">
      <Users class="w-4 h-4 shrink-0" style="color: #1D4ED8;" />
      Akun dibagi per kelompok: peserta didik (murid) dan pendidik & tenaga kependidikan (PTK).
    </div>
  </div>
</template>
