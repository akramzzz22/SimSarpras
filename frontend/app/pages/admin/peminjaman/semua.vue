<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Semua Peminjaman' })
</script>

<template>
  <PeminjamanList
    mode="semua"
    title="Semua Peminjaman"
    description="Seluruh pengajuan dan riwayat peminjaman barang."
  />
</template>
