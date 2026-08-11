<script setup lang="ts">
definePageMeta({ layout: 'staff', middleware: ['auth', 'kaproli'], title: 'Profil Saya' })
</script>

<template>
  <UserProfile accent="#059669" />
</template>
