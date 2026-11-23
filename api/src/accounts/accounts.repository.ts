import { Injectable } from '@nestjs/common';
import { Account } from './account.js';

/**
 * Persistencia en memoria del catálogo. Es una decisión deliberada del alcance
 * mínimo: la interfaz pequeña (findByCode/findAll/save/delete) deja la puerta
 * abierta a reemplazarla por un repositorio real sin tocar los casos de uso.
 */
@Injectable()
export class AccountsRepository {
  private readonly accounts = new Map<string, Account>();

  findByCode(code: string): Account | undefined {
    return this.accounts.get(code);
  }

  findAll(): Account[] {
    return [...this.accounts.values()];
  }

  save(account: Account): void {
    this.accounts.set(account.code, account);
  }

  delete(code: string): void {
    this.accounts.delete(code);
  }

  count(): number {
    return this.accounts.size;
  }
}
