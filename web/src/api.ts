import type { Account, AccountTreeNode, CreateAccountPayload, ErrorKey } from './types'

const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function apiUrl(ruta: string): string {
  return `${base}${ruta}`
}

/** Error de la API con la `key` estable del dominio, para mapear a campos de la UI. */
export class ApiError extends Error {
  readonly key: ErrorKey
  readonly statusCode: number

  constructor(key: ErrorKey, message: string, statusCode: number) {
    super(message)
    this.name = 'ApiError'
    this.key = key
    this.statusCode = statusCode
  }
}

async function request<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(apiUrl(ruta), {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
  })
  if (respuesta.ok) {
    if (respuesta.status === 204) return undefined as T
    return (await respuesta.json()) as T
  }

  let body: { key?: string; message?: string } | null = null
  try {
    body = (await respuesta.json()) as { key?: string; message?: string }
  } catch {
    // Cuerpo no JSON (p. ej. proxy caído): caemos al mensaje genérico.
  }
  throw new ApiError(
    (body?.key as ErrorKey) ?? 'UNKNOWN',
    body?.message ?? `No se pudo hablar con la API (HTTP ${respuesta.status}).`,
    respuesta.status,
  )
}

export function fetchTree(): Promise<AccountTreeNode[]> {
  return request<AccountTreeNode[]>('/accounts/tree')
}

export function createAccount(cuenta: CreateAccountPayload): Promise<Account> {
  return request<Account>('/accounts', {
    method: 'POST',
    body: JSON.stringify(cuenta),
  })
}

export function deleteAccount(code: string): Promise<void> {
  return request<void>(`/accounts/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  })
}
