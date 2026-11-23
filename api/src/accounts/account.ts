export type AccountNature = 'debito' | 'credito';

export type AccountLevel = 'clase' | 'grupo' | 'cuenta' | 'subcuenta';

export interface Account {
  code: string;
  name: string;
  nature: AccountNature;
}

export interface AccountTreeNode {
  code: string;
  name: string;
  nature: AccountNature;
  children: AccountTreeNode[];
}

export interface CreateAccountDto {
  code: string;
  name: string;
  /** Solo para clases (código de 1 dígito). Los descendientes heredan la del padre. */
  nature?: AccountNature;
}

const LEVEL_BY_LENGTH: Record<number, AccountLevel> = {
  1: 'clase',
  2: 'grupo',
  4: 'cuenta',
  6: 'subcuenta',
};

const PARENT_LENGTH_BY_LENGTH: Record<number, number> = {
  2: 1,
  4: 2,
  6: 4,
};

export function levelOf(code: string): AccountLevel | null {
  return LEVEL_BY_LENGTH[code.length] ?? null;
}

/**
 * El padre de una cuenta es el prefijo de su código en el nivel inmediatamente
 * superior (110505 → 1105 → 11 → 1). Las clases no tienen padre.
 */
export function parentCodeOf(code: string): string | null {
  const parentLength = PARENT_LENGTH_BY_LENGTH[code.length];
  return parentLength === undefined ? null : code.slice(0, parentLength);
}
