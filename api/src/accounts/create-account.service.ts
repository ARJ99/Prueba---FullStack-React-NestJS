import { Injectable } from '@nestjs/common';
import {
  Account,
  CreateAccountDto,
  levelOf,
  parentCodeOf,
} from './account.js';
import {
  DuplicateAccountCodeError,
  InvalidAccountCodeError,
  InvalidAccountNameError,
  NatureRequiredError,
  ParentAccountNotFoundError,
} from './accounts.errors.js';
import { AccountsRepository } from './accounts.repository.js';

/**
 * Caso de uso: dar de alta una cuenta en el catálogo.
 *
 * Reglas del catálogo jerárquico:
 * - El código es la identidad: numérico y con longitud de nivel válida
 *   (1 = clase, 2 = grupo, 4 = cuenta, 6 = subcuenta).
 * - Solo las clases llevan naturaleza explícita; los niveles inferiores
 *   heredan la del padre (la naturaleza es un invariante del árbol).
 * - El padre de un código es su prefijo en el nivel inmediatamente superior.
 */
@Injectable()
export class CreateAccountService {
  constructor(private readonly repository: AccountsRepository) {}

  execute(dto: CreateAccountDto): Account {
    // 1. Código: numérico puro y longitud de nivel válida.
    if (typeof dto.code !== 'string' || !/^\d+$/.test(dto.code) || levelOf(dto.code) === null) {
      throw new InvalidAccountCodeError();
    }

    // 2. Nombre: obligatorio, sin contar espacios de los extremos.
    const name = typeof dto.name === 'string' ? dto.name.trim() : '';
    if (name.length === 0) {
      throw new InvalidAccountNameError();
    }

    const level = levelOf(dto.code);

    // 3. Unicidad del código en el catálogo.
    if (this.repository.findByCode(dto.code) !== undefined) {
      throw new DuplicateAccountCodeError(dto.code);
    }

    // 4. Naturaleza: obligatoria solo para clases; los demás heredan la del
    //    padre, y para heredarla el padre debe existir.
    let nature: Account['nature'];
    if (level === 'clase') {
      if (dto.nature !== 'debito' && dto.nature !== 'credito') {
        throw new NatureRequiredError();
      }
      nature = dto.nature;
    } else {
      const parentCode = parentCodeOf(dto.code) as string;
      const parent = this.repository.findByCode(parentCode);
      if (parent === undefined) {
        throw new ParentAccountNotFoundError(parentCode);
      }
      nature = parent.nature;
    }

    // 5. Persistencia.
    const account: Account = { code: dto.code, name, nature };
    this.repository.save(account);
    return account;
  }
}
