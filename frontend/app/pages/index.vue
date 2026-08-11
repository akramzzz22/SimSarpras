<script setup lang="ts">
const authStore = useAuthStore()

if (authStore.isAuthenticated) {
  await navigateTo(rolesHome(authStore.roles))
} else {
  await navigateTo('/login')
}
</script>

<template>
  <div />
</template>
