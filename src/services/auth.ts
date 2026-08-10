import { http } from '@/lib/http'
import type { ApiUser, LoginResponse, RegisterResponse } from '@/types/api'

export function register(input: {
  name: string
  email: string
  password: string
}): Promise<RegisterResponse> {
  return http.post<RegisterResponse>('/api/auth/register', { body: input })
}

export function activate(token: string): Promise<{ user: ApiUser }> {
  return http.get<{ user: ApiUser }>(`/api/auth/activate/${encodeURIComponent(token)}`)
}

export function login(input: { email: string; password: string }): Promise<LoginResponse> {
  return http.post<LoginResponse>('/api/auth/login', { body: input })
}

export function me(): Promise<{ user: ApiUser }> {
  return http.get<{ user: ApiUser }>('/api/auth/me')
}
