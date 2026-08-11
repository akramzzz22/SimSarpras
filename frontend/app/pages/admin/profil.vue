<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], title: 'Profil' })
</script>

<template>
  <UserProfile wide />
</template>
