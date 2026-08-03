// Middleware role: Ketua Proli
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (authStore.role !== 'kaproli') {
    return navigateTo('/unauthorized')
  }
})
