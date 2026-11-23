import { useCallback, useEffect, useRef, useState } from 'react'
import { createAccount, deleteAccount, fetchTree } from '../api'
import type { AccountTreeNode, CreateAccountPayload } from '../types'

export interface UseCatalogResult {
  tree: AccountTreeNode[]
  /** true solo mientras no hay datos aún (carga inicial o recarga sin datos). */
  loading: boolean
  /** Mensaje si la carga (inicial o recarga) falló; null si no hay error. */
  loadError: string | null
  /** Vuelve a pedir el árbol; mientras tanto se sigue mostrando el árbol previo. */
  reload(): void
  /** Crea la cuenta; lanza ApiError si falla; recarga el árbol al éxito. */
  create(payload: CreateAccountPayload): Promise<void>
  /** Elimina la cuenta; lanza ApiError si falla; recarga el árbol al éxito. */
  remove(code: string): Promise<void>
  creating: boolean
  /** Código de la cuenta en eliminación en curso, o null. */
  removingCode: string | null
}

function mensajeDeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Ocurrió un error inesperado.'
}

/**
 * Estado del catálogo: árbol, carga inicial, recarga, creación y eliminación.
 * La carga es idempotente (segura bajo el doble montaje de StrictMode):
 * cada petición lleva un número de turno y solo la última actualiza el estado.
 */
export function useCatalog(): UseCatalogResult {
  const [tree, setTree] = useState<AccountTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [removingCode, setRemovingCode] = useState<string | null>(null)

  // Turno de la petición de carga en curso; descarta respuestas obsoletas.
  const turnoRef = useRef(0)

  const load = useCallback(async (): Promise<void> => {
    const turno = ++turnoRef.current
    try {
      const data = await fetchTree()
      if (turnoRef.current !== turno) return // llegó una recarga más nueva
      setTree(data)
      setLoadError(null)
      setLoading(false)
    } catch (error) {
      if (turnoRef.current !== turno) return
      setLoadError(mensajeDeError(error))
      // Con datos previos no volvemos a "cargando": se sigue mostrando el árbol.
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const reload = useCallback((): void => {
    void load()
  }, [load])

  const create = useCallback(
    async (payload: CreateAccountPayload): Promise<void> => {
      setCreating(true)
      try {
        await createAccount(payload)
        await load() // el fallo de la recarga se refleja en loadError, no aquí
      } finally {
        setCreating(false)
      }
    },
    [load],
  )

  const remove = useCallback(
    async (code: string): Promise<void> => {
      setRemovingCode(code)
      try {
        await deleteAccount(code)
        await load()
      } finally {
        setRemovingCode(null)
      }
    },
    [load],
  )

  return { tree, loading, loadError, reload, create, remove, creating, removingCode }
}
