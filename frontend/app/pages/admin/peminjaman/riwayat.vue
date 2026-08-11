<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Riwayat Peminjaman' })
</script>

<template>
  <PeminjamanList
    mode="riwayat"
    title="Riwayat Peminjaman"
    description="Peminjaman yang sudah dikembalikan atau ditolak."
  />
</template>
