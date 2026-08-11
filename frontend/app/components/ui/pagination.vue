<script setup lang="ts">
import { computed, watch } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    /** Halaman aktif (v-model) */
    page: number
    /** Total jumlah data */
    total: number
    /** Jumlah data per halaman */
    perPage?: number
    /** Label satuan data (untuk teks info) */
    label?: string
  }>(),
  { perPage: 20, label: 'data' }
)

const emit = defineEmits<{ (e: 'update:page', page: number): void }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))

const rangeStart = computed(() =>
  props.total === 0 ? 0 : Math.min((props.page - 1) * props.perPage + 1, props.total)
)
const rangeEnd = computed(() => Math.min(props.page * props.perPage, props.total))

/** Daftar nomor halaman dengan elipsis untuk jumlah halaman banyak */
const pageItems = computed<(number | '…')[]>(() => {
  const total = totalPages.value
  const cur = Math.min(Math.max(props.page, 1), total)
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = new Set<number>([1, total, cur - 1, cur, cur + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const items: (number | '…')[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) items.push('…')
    items.push(p)
    prev = p
  }
  return items
})

function go(p: number) {
  if (p < 1 || p > totalPages.value || p === props.page) return
  emit('update:page', p)
}

// Jika jumlah halaman menyusut (mis. setelah filter/penghapusan), kembalikan ke
// halaman terakhir yang valid supaya tidak ada halaman kosong.
watch(totalPages, (tp) => {
  if (props.page > tp) emit('update:page', tp)
})
</script>

<template>    <div
    v-if="total > 0"
    class="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3"
    style="border-top: 1px solid #E5E7EB;"
  >
    <p class="text-xs text-gray-500">
      Menampilkan
      <span class="font-semibold text-gray-700">{{ rangeStart }}–{{ rangeEnd }}</span>
      dari
      <span class="font-semibold text-gray-700">{{ total }}</span>
      {{ label }}
    </p>

    <nav class="flex items-center gap-1" aria-label="Paginasi">
      <button
        class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="page <= 1"
        title="Halaman sebelumnya"
        @click="go(page - 1)"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <template v-for="(p, i) in pageItems" :key="i">
        <span v-if="p === '…'" class="px-1 text-xs text-gray-400 select-none">…</span>
        <button
          v-else
          class="inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg text-xs font-semibold border transition hover:bg-gray-50"
          :style="p === page ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' } : { borderColor: '#D1D5DB', color: '#4B5563' }"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>

      <button
        class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="page >= totalPages"
        title="Halaman berikutnya"
        @click="go(page + 1)"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </nav>
  </div>
</template>
