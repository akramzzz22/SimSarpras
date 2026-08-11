<script setup lang="ts">
import { Clock } from 'lucide-vue-next'
import { fmtJam } from '~/utils/format'

// Indikator slot waktu peminjaman (pola booking): menampilkan rentang jam nyata.
defineProps<{
  jamMulai?: string | null
  jamSelesai?: string | null
}>()
</script>

<template>
  <div class="mt-3">
    <div class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Slot Waktu</div>
    <div class="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-100 px-3 py-1.5">
      <Clock class="w-3.5 h-3.5 text-red-500 shrink-0" />
      <span class="text-xs font-semibold text-red-700 tabular-nums">
        {{ fmtJam(jamMulai) }} – {{ fmtJam(jamSelesai) }}
      </span>
    </div>
  </div>
</template>
