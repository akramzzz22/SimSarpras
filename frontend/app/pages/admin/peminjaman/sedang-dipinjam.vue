<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Sedang Dipinjam' })
</script>

<template>
  <PeminjamanList
    mode="sedang"
    title="Sedang Dipinjam"
    description="Peminjaman yang sudah disetujui atau barangnya sedang dipinjam."
  />
</template>
