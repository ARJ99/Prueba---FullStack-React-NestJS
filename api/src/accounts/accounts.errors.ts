export class InvalidAccountCodeError extends Error {
  constructor(message = 'El código debe ser numérico y tener una longitud válida (1, 2, 4 o 6 dígitos).') {
    super(message);
    this.name = 'InvalidAccountCodeError';
  }
}

export class InvalidAccountNameError extends Error {
  constructor(message = 'El nombre de la cuenta es obligatorio.') {
    super(message);
    this.name = 'InvalidAccountNameError';
  }
}

export class NatureRequiredError extends Error {
  constructor(message = 'Las clases (código de 1 dígito) requieren una naturaleza: debito o credito.') {
    super(message);
    this.name = 'NatureRequiredError';
  }
}

export class DuplicateAccountCodeError extends Error {
  constructor(code: string) {
    super(`Ya existe una cuenta con el código ${code}.`);
    this.name = 'DuplicateAccountCodeError';
  }
}

export class ParentAccountNotFoundError extends Error {
  constructor(parentCode: string) {
    super(`No existe la cuenta padre ${parentCode}. No se puede crear una cuenta huérfana.`);
    this.name = 'ParentAccountNotFoundError';
  }
}

export class AccountNotFoundError extends Error {
  constructor(code: string) {
    super(`No existe una cuenta con el código ${code}.`);
    this.name = 'AccountNotFoundError';
  }
}

export class AccountHasChildrenError extends Error {
  constructor(code: string) {
    super(`La cuenta ${code} tiene cuentas hijas y no puede eliminarse.`);
    this.name = 'AccountHasChildrenError';
  }
}
