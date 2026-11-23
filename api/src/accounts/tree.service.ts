import { Injectable } from '@nestjs/common';
import { AccountTreeNode, parentCodeOf } from './account.js';
import { AccountsRepository } from './accounts.repository.js';

/**
 * Consulta del catálogo como árbol jerárquico: cada cuenta cuelga de la
 * cuenta cuyo código es el prefijo de longitud del nivel inmediamente
 * superior (ver `parentCodeOf`). Las raíces son las clases (código de 1 dígito).
 */
@Injectable()
export class TreeService {
  constructor(private readonly repository: AccountsRepository) {}

  execute(): AccountTreeNode[] {
    const nodesByCode = new Map<string, AccountTreeNode>();

    for (const account of this.repository.findAll()) {
      // Nodos nuevos: nada comparte referencia con la cuenta almacenada.
      nodesByCode.set(account.code, {
        code: account.code,
        name: account.name,
        nature: account.nature,
        children: [],
      });
    }

    // Solo las clases (1 dígito) son raíces; una cuenta cuyo padre no existe
    // (estado imposible si la creación/borrado validan, pero defendido aquí)
    // no se cuelga de ninguna raíz para respetar ese invariante.
    const roots: AccountTreeNode[] = [];
    for (const node of nodesByCode.values()) {
      const parentCode = parentCodeOf(node.code);
      if (parentCode === null) {
        roots.push(node);
        continue;
      }
      const parent = nodesByCode.get(parentCode);
      if (parent !== undefined) {
        parent.children.push(node);
      }
    }

    const byCode = (a: AccountTreeNode, b: AccountTreeNode): number =>
      a.code < b.code ? -1 : a.code > b.code ? 1 : 0;

    // Todos los códigos son dígitos de longitud fija por nivel, así que el
    // orden lexicográfico coincide con el numérico entre hermanos.
    for (const node of nodesByCode.values()) {
      node.children.sort(byCode);
    }
    roots.sort(byCode);

    return roots;
  }
}
