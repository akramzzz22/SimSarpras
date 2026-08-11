<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Terlambat' })
</script>

<template>
  <PeminjamanList
    mode="terlambat"
    title="Peminjaman Terlambat"
    description="Peminjaman aktif yang melewati tanggal pinjam — perlu tindak lanjut pengembalian."
  />
</template>
