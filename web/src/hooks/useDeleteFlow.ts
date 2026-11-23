import { useCallback, useState } from 'react'
import { ApiError } from '../api'

export interface DeleteFlowState {
  /** Código esperando confirmación (diálogo abierto), o null. */
  pendingDelete: string | null
  /** Código cuya eliminación está en curso, o null. */
  deletingCode: string | null
  /** Error del último intento fallido, para que App lo muestre junto al árbol. */
  deleteError: { key: string; message: string } | null
  requestDelete(code: string): void
  confirmDelete(): void
  cancelDelete(): void
  dismissError(): void
}

/**
 * Flujo de eliminación de cuentas: pedir confirmación, ejecutar la
 * eliminación y exponer el error del último intento fallido (p. ej.
 * `HAS_CHILDREN`) para que la pantalla lo muestre junto al árbol.
 *
 * El diálogo permanece abierto mientras la eliminación está en curso
 * (`deletingCode !== null`) y se cierra al resolver, con éxito o con error.
 */
export function useDeleteFlow(options: {
  onDelete: (code: string) => Promise<void>
}): DeleteFlowState {
  const { onDelete } = options

  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deletingCode, setDeletingCode] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<{
    key: string
    message: string
  } | null>(null)

  const requestDelete = useCallback((code: string): void => {
    setDeleteError(null)
    setPendingDelete(code)
  }, [])

  const confirmDelete = useCallback((): void => {
    if (pendingDelete === null || deletingCode !== null) return
    const code = pendingDelete
    setDeletingCode(code)
    void onDelete(code)
      .then(() => {
        setDeleteError(null)
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError) {
          setDeleteError({ key: error.key, message: error.message })
        } else {
          setDeleteError({
            key: 'UNKNOWN',
            message: error instanceof Error ? error.message : String(error),
          })
        }
      })
      .finally(() => {
        setDeletingCode(null)
        setPendingDelete(null)
      })
  }, [pendingDelete, deletingCode, onDelete])

  const cancelDelete = useCallback((): void => {
    setPendingDelete(null)
  }, [])

  const dismissError = useCallback((): void => {
    setDeleteError(null)
  }, [])

  return {
    pendingDelete,
    deletingCode,
    deleteError,
    requestDelete,
    confirmDelete,
    cancelDelete,
    dismissError,
  }
}
