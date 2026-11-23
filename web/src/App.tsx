import { AccountTree } from './components/AccountTree'
import { ConfirmDialog } from './components/ConfirmDialog'
import { CreateAccountForm } from './components/CreateAccountForm'
import { useCatalog } from './hooks/useCatalog'
import { useDeleteFlow } from './hooks/useDeleteFlow'
import styles from './App.module.css'

export default function App() {
  const catalog = useCatalog()
  const deleteFlow = useDeleteFlow({ onDelete: catalog.remove })

  return (
    <main className={styles.app}>
      <header className={styles.header}>
        <h1>Catálogo de cuentas</h1>
      </header>

      <section className={styles.card} aria-labelledby="titulo-crear">
        <h2 id="titulo-crear">Nueva cuenta</h2>
        <CreateAccountForm onCreate={catalog.create} creating={catalog.creating} />
      </section>

      <section
        className={styles.card}
        aria-labelledby="titulo-arbol"
        aria-busy={catalog.loading}
      >
        <h2 id="titulo-arbol">Árbol del catálogo</h2>

        {catalog.loadError && (
          <div className={styles.error} role="alert">
            <p>{catalog.loadError}</p>
            <button type="button" onClick={catalog.reload}>
              Reintentar
            </button>
          </div>
        )}

        {deleteFlow.deleteError && (
          <div className={styles.error} role="alert">
            <p>{deleteFlow.deleteError.message}</p>
            <button type="button" onClick={deleteFlow.dismissError}>
              Cerrar
            </button>
          </div>
        )}

        {catalog.loading && <p className={styles.empty}>Cargando catálogo…</p>}

        {!catalog.loading && !catalog.loadError && catalog.tree.length === 0 && (
          <p className={styles.empty}>
            El catálogo está vacío. Crea la primera clase con el formulario.
          </p>
        )}

        {catalog.tree.length > 0 && (
          <AccountTree
            nodes={catalog.tree}
            onDelete={deleteFlow.requestDelete}
            deletingCode={catalog.removingCode}
          />
        )}
      </section>

      {deleteFlow.pendingDelete !== null && (
        <ConfirmDialog
          code={deleteFlow.pendingDelete}
          busy={deleteFlow.deletingCode !== null}
          onConfirm={deleteFlow.confirmDelete}
          onCancel={deleteFlow.cancelDelete}
        />
      )}
    </main>
  )
}
