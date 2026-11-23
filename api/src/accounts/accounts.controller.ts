import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type { Account, AccountTreeNode, CreateAccountDto } from './account.js';
import {
  AccountHasChildrenError,
  AccountNotFoundError,
  DuplicateAccountCodeError,
  InvalidAccountCodeError,
  InvalidAccountNameError,
  NatureRequiredError,
  ParentAccountNotFoundError,
} from './accounts.errors.js';
import { CreateAccountService } from './create-account.service.js';
import { TreeService } from './tree.service.js';
import { DeleteAccountService } from './delete-account.service.js';

/** Cuerpo de error de la API: `key` es estable y la UI lo usa para ubicar el error. */
interface ApiErrorBody {
  statusCode: number;
  key: string;
  message: string;
}

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly createAccountService: CreateAccountService,
    private readonly treeService: TreeService,
    private readonly deleteAccountService: DeleteAccountService,
  ) {}

  @Post()
  create(@Body() dto: CreateAccountDto): Account {
    try {
      return this.createAccountService.execute(dto);
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  @Get('tree')
  tree(): AccountTreeNode[] {
    return this.treeService.execute();
  }

  @Delete(':code')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('code') code: string): void {
    try {
      this.deleteAccountService.execute(code);
    } catch (error) {
      this.mapDomainError(error);
    }
  }

  /**
   * Traduce los errores del dominio a códigos HTTP y una `key` estable:
   * datos inválidos → 400, estado del catálogo en conflicto → 409,
   * código inexistente → 404.
   */
  private mapDomainError(error: unknown): never {
    const mapped = this.statusAndKeyOf(error);
    if (mapped === null) {
      throw error;
    }
    const body: ApiErrorBody = {
      statusCode: mapped.status,
      key: mapped.key,
      message: (error as Error).message,
    };
    throw new HttpException(body, mapped.status);
  }

  private statusAndKeyOf(error: unknown): { status: number; key: string } | null {
    if (error instanceof InvalidAccountCodeError) {
      return { status: HttpStatus.BAD_REQUEST, key: 'INVALID_CODE' };
    }
    if (error instanceof InvalidAccountNameError) {
      return { status: HttpStatus.BAD_REQUEST, key: 'INVALID_NAME' };
    }
    if (error instanceof NatureRequiredError) {
      return { status: HttpStatus.BAD_REQUEST, key: 'NATURE_REQUIRED' };
    }
    if (error instanceof DuplicateAccountCodeError) {
      return { status: HttpStatus.CONFLICT, key: 'DUPLICATE_CODE' };
    }
    if (error instanceof AccountHasChildrenError) {
      return { status: HttpStatus.CONFLICT, key: 'HAS_CHILDREN' };
    }
    if (error instanceof ParentAccountNotFoundError) {
      return { status: HttpStatus.NOT_FOUND, key: 'PARENT_NOT_FOUND' };
    }
    if (error instanceof AccountNotFoundError) {
      return { status: HttpStatus.NOT_FOUND, key: 'ACCOUNT_NOT_FOUND' };
    }
    return null;
  }
}
