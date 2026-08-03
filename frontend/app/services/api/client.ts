// Base API client menggunakan $fetch (ofetch) bawaan Nuxt
export function useApiClient() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  return $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ options }) {
      if (authStore.token) {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${authStore.token}`)
        options.headers = headers
      }
    },
    onResponseError({ response }) {
      // Token tidak valid / telah dihapus di server (mis. reset DB) →
      // logout otomatis agar tidak terus-menerus dapat 401 Unauthenticated.
      if (response.status === 401 && authStore.isAuthenticated) {
        authStore.logout()
        navigateTo('/login')
      }
    }
  })
}
