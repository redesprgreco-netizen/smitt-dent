// lib/api-client.ts — helper para llamadas fetch desde componentes cliente
import type { ApiResponse, PaginatedResponse } from '@/types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Error en la solicitud')
  return json
}

export const api = {
  get: <T>(url: string) => request<ApiResponse<T> & PaginatedResponse<T>>(url),
  post: <T>(url: string, body: unknown) =>
    request<ApiResponse<T>>(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<ApiResponse<T>>(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string) =>
    request<ApiResponse<T>>(url, { method: 'DELETE' }),
}
