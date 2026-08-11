<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Monitor, Sun, Moon, Check } from 'lucide-vue-next'
import { useTheme } from '~/composables/useTheme'
import { THEME_OPTIONS, type ThemeMode } from '~/utils/theme'

// tone: 'default' untuk bar terang, 'light' untuk bar berwarna/gelap (mis. bar identitas biru)
const props = withDefaults(defineProps<{ tone?: 'default' | 'light' }>(), {
  tone: 'default'
})

const { mode, setMode } = useTheme()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const activeIcon = computed(() => {
  if (mode.value === 'dark') return Moon
  if (mode.value === 'light') return Sun
  return Monitor
})

const activeLabel = computed(
  () => THEME_OPTIONS.find((o) => o.value === mode.value)?.label ?? 'Default'
)

const iconFor = (m: ThemeMode) => (m === 'dark' ? Moon : m === 'light' ? Sun : Monitor)

function pick(m: ThemeMode) {
  setMode(m)
  open.value = false
}

function onClickOutside(e: Event) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative shrink-0">
    <button
      :class="
        props.tone === 'light'
          ? 'p-1.5 rounded-md text-white/80 hover:bg-white/10 hover:text-white transition'
          : 'p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition'
      "
      :title="`Mode tampilan: ${activeLabel}`"
      @click.stop="open = !open"
    >
      <component :is="activeIcon" class="w-4 h-4" />
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50"
    >
      <div class="px-3 py-2 text-2xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
        Mode Tampilan
      </div>
      <button
        v-for="o in THEME_OPTIONS"
        :key="o.value"
        class="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
        :class="mode === o.value ? 'text-gray-900' : ''"
        @click="pick(o.value)"
      >
        <component :is="iconFor(o.value)" class="w-4 h-4" />
        {{ o.label }}
        <Check v-if="mode === o.value" class="w-3.5 h-3.5 ml-auto" style="color: #1D4ED8;" />
      </button>
    </div>
  </div>
</template>
