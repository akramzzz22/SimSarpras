<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { UserCog, ChevronDown, Check } from 'lucide-vue-next'
import { roleHomeMap, roleLabelMap } from '~/utils/roles'

const authStore = useAuthStore()
const route = useRoute()

const open = ref(false)

// Role user (mendukung double job) — fallback ke role tunggal bila daftar kosong
const userRoles = computed<string[]>(() => {
  const list = (authStore.roles.length ? authStore.roles : authStore.role ? [authStore.role] : [])
    .map((r) => String(r))
  return list
})

// Role aktif ditentukan dari path saat ini (mis. /kaproli/... → kaproli)
const activeRole = computed(() => {
  const seg = route.path.split('/')[1] ?? ''
  const map: Record<string, string> = {
    admin: 'admin',
    staff: 'staff_sarpras',
    kaproli: 'kaproli',
    guru: 'guru',
    murid: 'murid',
    kepsek: 'kepsek'
  }
  return map[seg] ?? (authStore.role ? String(authStore.role) : (userRoles.value[0] ?? ''))
})

const activeLabel = computed(() => roleLabelMap[activeRole.value] ?? 'Peran')

const canSwitch = computed(() => userRoles.value.length > 1)

function toggle() {
  if (canSwitch.value) open.value = !open.value
}

function switchTo(role: string) {
  open.value = false
  if (role === activeRole.value) return
  const home = roleHomeMap[role]
  if (home) navigateTo(home)
}

function onClickOutside(e: Event) {
  const el = e.target as HTMLElement
  if (!el.closest('[data-role-switch]')) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div v-if="canSwitch" class="relative shrink-0" data-role-switch>
    <button
      type="button"
      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition"
      style="border-color: #D1D5DB; background-color: #ffffff; color: #374151;"
      :title="`Pindah peran (aktif: ${activeLabel})`"
      @click.stop="toggle"
    >
      <UserCog class="w-3.5 h-3.5" style="color: #1D4ED8;" />
      <span class="text-xs font-semibold">{{ activeLabel }}</span>
      <ChevronDown class="w-3 h-3 transition-transform" :class="open ? 'rotate-180' : ''" style="color: #9CA3AF;" />
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute right-0 mt-1.5 w-48 bg-white overflow-hidden z-50"
      style="border: 1px solid #D1D5DB; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);"
    >
      <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style="border-bottom: 1px solid #E5E7EB; color: #9CA3AF;">
        Pilih Peran
      </div>
      <button
        v-for="r in userRoles"
        :key="r"
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition hover:bg-gray-50"
        style="color: #374151; border-bottom: 1px solid #F3F4F6;"
        @click="switchTo(r)"
      >
        <span class="flex-1">{{ roleLabelMap[r] ?? r }}</span>
        <Check v-if="r === activeRole" class="w-3.5 h-3.5" style="color: #1D4ED8;" />
      </button>
    </div>
  </div>
</template>
