// Hydrate auth store dari cookie saat app start (server & client).
// Plugin ini berjalan sebelum route middleware, sehingga user yang
// sudah login tetap authenticated saat refresh / SSR, tidak dilempar ke /login.
export default defineNuxtPlugin({
  name: 'auth',
  dependsOn: ['pinia'],
  setup() {
    const authStore = useAuthStore()
    authStore.hydrate()
  }
})
