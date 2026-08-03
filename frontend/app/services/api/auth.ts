import { useApiClient } from './client'

export interface LoginResponse {
  token: string
  user: Record<string, any>
  role: string
}

// Service untuk endpoint autentikasi (Laravel Sanctum)
export function useAuthService() {
  const api = useApiClient()

  return {
    login: (payload: { email: string; password: string }) =>
      api<LoginResponse>('/login', { method: 'POST', body: payload }),
    logout: () => api('/logout', { method: 'POST' }),
    me: () => api('/me', { method: 'GET' })
  }
}
