<script setup lang="ts">
import type { Component } from 'vue'

export interface QuickNavItem {
  title: string
  to: string
  icon: Component
  /** Prefiks path yang dianggap aktif untuk item ini (fallback: path `to` itu sendiri). */
  activePrefix?: string[]
}

const props = defineProps<{
  items: QuickNavItem[]
  /** Sumber kebenaran item aktif (parent sudah me-resolve modul: exact match / prefix terpanjang). */
  activeTitle?: string
}>()

const route = useRoute()

/**
 * Cocokkan item dengan route saat ini. Bila `activeTitle` diisi (dari parent),
 * dipakai sebagai sumber kebenaran — mencegah dua kartu menyala sekaligus saat
 * prefiks modul saling tumpang tindih (mis. /admin/pengaturan vs /admin/pengaturan/role).
 */
function isParentActive(item: QuickNavItem) {
  if (props.activeTitle) return item.title === props.activeTitle
  // Tanpa activeTitle (mis. layout staff): exact match dulu, lalu prefiks.
  const path = item.to.split('?')[0]
  if (route.path === path) {
    const qs = item.to.split('?')[1] ?? ''
    if (!qs) return true
    const params = new URLSearchParams(qs)
    for (const [k, v] of params.entries()) {
      if (String(route.query[k] ?? '') !== v) return false
    }
    return true
  }
  return (item.activePrefix ?? []).some((p) => route.path.startsWith(p))
}
</script>

<template>
  <nav
    class="flex items-center gap-2 overflow-x-auto py-2.5 px-3 lg:px-6"
    style="background-color: var(--app-bg, #F8F9FA); border-bottom: 1px solid var(--app-border, #D1D5DB);"
    aria-label="Navigasi modul"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="group inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0"
      :class="isParentActive(item) ? 'quick-nav-card-active' : ''"
      :style="isParentActive(item)
        ? { border: '1px solid' }
        : { backgroundColor: 'var(--app-surface, #ffffff)', border: '1px solid var(--app-border-light, #E5E7EB)', color: 'var(--app-text-2, #374151)' }"
    >
      <component :is="item.icon" class="w-4 h-4 shrink-0" />
      <span>{{ item.title }}</span>
      <span
        v-if="isParentActive(item)"
        class="w-1.5 h-1.5 rounded-full shrink-0"
        style="background-color: #1D4ED8;"
      />
    </NuxtLink>
  </nav>
</template>
