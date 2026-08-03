// Middleware role: Staff Sarpras
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (authStore.role !== 'staff_sarpras') {
    return navigateTo('/unauthorized')
  }
})
