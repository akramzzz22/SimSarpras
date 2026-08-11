// Middleware role: Kepala Sekolah
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (!authStore.hasRole('kepsek')) {
    return navigateTo('/unauthorized')
  }
})
