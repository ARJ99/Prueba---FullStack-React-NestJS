export type AccountNature = 'debito' | 'credito'

export interface Account {
  code: string
  name: string
  nature: AccountNature
}

export interface AccountTreeNode {
  code: string
  name: string
  nature: AccountNature
  children: AccountTreeNode[]
}

export interface CreateAccountPayload {
  code: string
  name: string
  /** Solo para clases (código de 1 dígito); los descendientes heredan la del padre. */
  nature?: AccountNature
}

/**
 * Keys de error que devuelve la API en el cuerpo de las respuestas
 * de error (junto a `message` y `statusCode`). La UI las usa para
 * ubicar cada error junto al campo que corresponde.
 */
export type ErrorKey =
  | 'INVALID_CODE'
  | 'INVALID_NAME'
  | 'NATURE_REQUIRED'
  | 'DUPLICATE_CODE'
  | 'PARENT_NOT_FOUND'
  | 'ACCOUNT_NOT_FOUND'
  | 'HAS_CHILDREN'
  | 'UNKNOWN'
