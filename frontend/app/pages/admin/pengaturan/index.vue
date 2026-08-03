<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Pengaturan' })

await navigateTo('/admin/pengaturan/role', { replace: true })
</script>

<template>
  <div />
</template>
