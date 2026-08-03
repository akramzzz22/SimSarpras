<script setup lang="ts">
const authStore = useAuthStore()

if (authStore.isAuthenticated) {
  await navigateTo(roleHome(authStore.role))
} else {
  await navigateTo('/login')
}
</script>

<template>
  <div />
</template>
