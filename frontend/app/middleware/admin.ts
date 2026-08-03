// Middleware role: Admin
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (authStore.role !== 'admin') {
    return navigateTo('/unauthorized')
  }
})
