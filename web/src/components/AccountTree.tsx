import { useState } from 'react'
import type { ReactNode } from 'react'
import type { AccountTreeNode } from '../types'
import styles from './AccountTree.module.css'

export interface AccountTreeProps {
  nodes: AccountTreeNode[]
  /** Al pasarlo, cada nodo muestra un botón "Eliminar". */
  onDelete?: (code: string) => void
  /** Código en eliminación en curso: deshabilita ese botón y muestra "Eliminando…". */
  deletingCode?: string | null
}

interface AccountTreeItemProps {
  node: AccountTreeNode
  depth: number
  collapsed: Set<string>
  onToggle: (code: string) => void
  onDelete?: (code: string) => void
  deletingCode?: string | null
}

/**
 * Fila de un nodo y, si está expandido, su subárbol. El estado de
 * colapso vive en el componente raíz (`AccountTree`), así que un nodo
 * nuevo que llega por props mantiene el estado de expansión previo.
 */
function AccountTreeItem(props: AccountTreeItemProps): ReactNode {
  const { node, depth, collapsed, onToggle, onDelete, deletingCode } = props
  const hasChildren = node.children.length > 0
  const isExpanded = !collapsed.has(node.code)
  const isDeleting = deletingCode === node.code
  const subtreeId = `account-tree-subtree-${node.code}`

  const badgeClass =
    node.nature === 'debito' ? styles.natureDebito : styles.natureCredito

  return (
    <li>
      <div className={styles.row}>
        {hasChildren ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={() => onToggle(node.code)}
            aria-expanded={isExpanded}
            aria-controls={subtreeId}
            aria-label={isExpanded ? `Contraer ${node.code}` : `Expandir ${node.code}`}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className={styles.togglePlaceholder} aria-hidden="true">
            •
          </span>
        )}

        <span className={styles.code}>{node.code}</span>
        <span className={styles.name}>{node.name}</span>
        <span className={`${styles.nature} ${badgeClass}`}>
          {node.nature === 'debito' ? 'débito' : 'crédito'}
        </span>

        {onDelete && (
          <button
            type="button"
            className={styles.delete}
            onClick={() => onDelete(node.code)}
            aria-label={`Eliminar cuenta ${node.code}`}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando…' : 'Eliminar'}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul className={styles.subtree} id={subtreeId}>
          {node.children.map((child) => (
            <AccountTreeItem
              key={child.code}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              onDelete={onDelete}
              deletingCode={deletingCode}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * Árbol de cuentas (clases → grupos → cuentas). Recibe los datos ya
 * cargados por props; no hace fetch. Por defecto todo está expandido.
 */
export function AccountTree(props: AccountTreeProps): ReactNode {
  const { nodes, onDelete, deletingCode } = props
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (code: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  if (nodes.length === 0) {
    return null
  }

  return (
    <ul className={styles.tree}>
      {nodes.map((node) => (
        <AccountTreeItem
          key={node.code}
          node={node}
          depth={0}
          collapsed={collapsed}
          onToggle={toggle}
          onDelete={onDelete}
          deletingCode={deletingCode}
        />
      ))}
    </ul>
  )
}
