// Middleware role: Staff Sarpras
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (!authStore.hasRole('staff_sarpras')) {
    return navigateTo('/unauthorized')
  }
})
