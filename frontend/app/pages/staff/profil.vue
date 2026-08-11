<script setup lang="ts">
definePageMeta({ layout: 'staff', middleware: ['auth', 'staff'], title: 'Profil' })
</script>

<template>
  <UserProfile accent="#059669" />
</template>
