import {
  Body,
  BadRequestException,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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
   * Traduce los errores del dominio a códigos HTTP:
   * datos inválidos → 400, estado del catálogo en conflicto → 409,
   * código inexistente → 404.
   */
  private mapDomainError(error: unknown): never {
    if (
      error instanceof InvalidAccountCodeError ||
      error instanceof InvalidAccountNameError ||
      error instanceof NatureRequiredError
    ) {
      throw new BadRequestException(error.message);
    }
    if (error instanceof DuplicateAccountCodeError || error instanceof AccountHasChildrenError) {
      throw new ConflictException(error.message);
    }
    if (error instanceof ParentAccountNotFoundError || error instanceof AccountNotFoundError) {
      throw new NotFoundException(error.message);
    }
    throw error;
  }
}
