// Middleware untuk halaman publik (login): user yang sudah login dialihkan ke dashboard role-nya
export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()

  if (authStore.isAuthenticated) {
    return navigateTo(roleHome(authStore.role))
  }
})
