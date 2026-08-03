<script setup lang="ts">
import { ref, computed } from 'vue'
import { Camera, CameraOff, Loader2, Zap, ZapOff, RefreshCw, ScanLine } from 'lucide-vue-next'
import { QrcodeStream } from 'vue-qrcode-reader'

const emit = defineEmits<{
  scanned: [value: string]
}>()

const paused = ref(false)
const cameraReady = ref(false)
const torchOn = ref(false)
const error = ref<string | null>(null)

const showScanner = computed(() => !error.value)

function onDetect(codes: { rawValue: string }[]) {
  const value = codes[0]?.rawValue
  if (!value) return
  paused.value = true
  emit('scanned', value)
}

function onError(err: any) {
  const name = err?.name ?? ''

  // Halaman tidak dianggap "secure context" (mis. dibuka via http:// bukan https://)
  // → navigator.mediaDevices tidak tersedia sehingga kamera PASTI gagal.
  // Beri tahu user dengan pesan yang jelas, bukan error TypeError mentah.
  if (!navigator.mediaDevices || !window.isSecureContext) {
    error.value = 'Kamera tidak tersedia di halaman ini. Pastikan membuka aplikasi lewat https:// (bukan http://), lalu izinkan akses kamera.'
    return
  }

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    error.value = 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser, lalu coba lagi.'
  } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    error.value = 'Kamera tidak ditemukan pada perangkat ini.'
  } else if (name === 'NotReadableError' || name === 'TrackStartError') {
    error.value = 'Kamera sedang dipakai aplikasi lain. Tutup aplikasi lain lalu coba lagi.'
  } else if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    error.value = 'Kamera tidak mendukung pengaturan yang dibutuhkan.'
  } else {
    error.value = 'Tidak dapat mengakses kamera. Coba lagi atau gunakan kode manual.'
  }
}

function onCameraOn() {
  cameraReady.value = true
  error.value = null
}

function resume() {
  paused.value = false
  error.value = null
  cameraReady.value = false
}

function retry() {
  error.value = null
  cameraReady.value = false
}

function toggleTorch() {
  torchOn.value = !torchOn.value
}

defineExpose({ resume, retry })
</script>

<template>
  <div class="relative rounded-2xl overflow-hidden bg-slate-900 aspect-square">
    <!-- Loading kamera -->
    <div v-if="!cameraReady && !error" class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
      <Loader2 class="w-7 h-7 animate-spin" />
      <span class="text-xs font-medium">Mengaktifkan kamera…</span>
    </div>

    <!-- Error kamera -->
    <div v-else-if="error" class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <CameraOff class="w-8 h-8 text-white/50" />
      <p class="text-xs text-white/90 max-w-xs">{{ error }}</p>
      <button
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition"
        @click="retry"
      >
        <RefreshCw class="w-3.5 h-3.5" />
        Coba Lagi
      </button>
    </div>

    <!-- Stream kamera (client-only, SSR-safe) -->
    <ClientOnly v-if="showScanner">
      <QrcodeStream
        :paused="paused"
        :torch="torchOn"
        class="w-full h-full"
        @detect="onDetect"
        @error="onError"
        @camera-on="onCameraOn"
      />

      <!-- Overlay scan frame -->
      <div v-if="cameraReady && !paused" class="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div class="relative w-52 h-52">
          <!-- Sudut frame -->
          <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
          <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
          <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
          <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
          <!-- Garis scan -->
          <div class="absolute left-2 right-2 h-0.5 bg-emerald-400/80 rounded-full animate-[scanline_2s_ease-in-out_infinite] top-0" />
        </div>
      </div>

      <!-- Pesan pause -->
      <div v-if="paused" class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
        <ScanLine class="w-8 h-8 text-emerald-400" />
        <p class="text-sm text-white font-medium">Kode terdeteksi</p>
        <button
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
          @click="resume"
        >
          <Camera class="w-3.5 h-3.5" />
          Scan Lagi
        </button>
      </div>
    </ClientOnly>

    <!-- Kontrol bawah -->
    <div class="absolute bottom-0 inset-x-0 p-3 flex items-center justify-center">
      <button
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur text-white text-xs font-medium hover:bg-black/60 transition"
        :title="torchOn ? 'Matikan lampu' : 'Nyalakan lampu'"
        @click="toggleTorch"
      >
        <Zap v-if="!torchOn" class="w-3.5 h-3.5" />
        <ZapOff v-else class="w-3.5 h-3.5" />
        {{ torchOn ? 'Lampu Nyala' : 'Lampu' }}
      </button>
    </div>
  </div>
</template>

<style>
/* Non-scoped agar nama keyframe tidak di-hash Vue & tetap cocok dengan arbitrary value Tailwind */
@keyframes scanline {
  0%, 100% { top: 0.25rem; }
  50% { top: calc(100% - 0.25rem); }
}
</style>
