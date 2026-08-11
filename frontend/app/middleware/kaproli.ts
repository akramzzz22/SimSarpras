// Middleware role: Ketua Proli
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (!authStore.hasRole('kaproli')) {
    return navigateTo('/unauthorized')
  }
})
