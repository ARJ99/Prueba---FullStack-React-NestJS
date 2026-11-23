import { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  code: string
  /** true mientras la eliminación está en curso. */
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Diálogo de confirmación para eliminar una cuenta. */
export function ConfirmDialog({
  code,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactElement {
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Foco inicial en el botón de confirmación.
  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  // Cerrar con Escape mientras el diálogo está montado.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-delete-title" className={styles.title}>
          Eliminar cuenta
        </h2>
        <p className={styles.body}>
          ¿Eliminar la cuenta {code}? Esta acción no se puede deshacer.
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
