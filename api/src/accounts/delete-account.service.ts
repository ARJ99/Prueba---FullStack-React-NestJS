import { Injectable } from '@nestjs/common';
import { parentCodeOf } from './account.js';
import { AccountHasChildrenError, AccountNotFoundError } from './accounts.errors.js';
import { AccountsRepository } from './accounts.repository.js';

/**
 * Caso de uso: eliminar una cuenta del catálogo.
 *
 * Regla de negocio: solo se pueden eliminar cuentas hoja. Si alguna cuenta
 * del catálogo tiene a la cuenta objetivo como padre, la eliminación se
 * rechaza (la verificación ocurre ANTES de borrar, nunca después).
 */
@Injectable()
export class DeleteAccountService {
  constructor(private readonly repository: AccountsRepository) {}

  execute(code: string): void {
    if (this.repository.findByCode(code) === undefined) {
      throw new AccountNotFoundError(code);
    }

    const hasChildren = this.repository
      .findAll()
      .some((child) => parentCodeOf(child.code) === code);

    if (hasChildren) {
      throw new AccountHasChildrenError(code);
    }

    this.repository.delete(code);
  }
}
