import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller.js';
import { AccountsRepository } from './accounts.repository.js';
import { CreateAccountService } from './create-account.service.js';
import { TreeService } from './tree.service.js';
import { DeleteAccountService } from './delete-account.service.js';

@Module({
  controllers: [AccountsController],
  providers: [AccountsRepository, CreateAccountService, TreeService, DeleteAccountService],
})
export class AccountsModule {}
