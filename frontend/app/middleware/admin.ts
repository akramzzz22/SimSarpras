// Middleware role: Admin
export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()

  if (!authStore.hasRole('admin')) {
    return navigateTo('/unauthorized')
  }
})
