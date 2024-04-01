import { Module } from "@nestjs/common";
import { AccountsController } from "./infra/http/controllers/accounts.controller";
import { TransactionsController } from "./infra/http/controllers/transaction.controller";
import { KyselyAccountsRepository } from "./infra/kysely/repositories/KyselyAccountsRepository";
import { AccountsRepository } from "./repositories/accounts.repository";
import { AddTransaction } from "./services/AddTransaction.service";
import { CreateAccount } from "./services/CreateAccount.service";

@Module({
	controllers: [AccountsController, TransactionsController],
	providers: [
		{
			provide: AccountsRepository,
			useClass: KyselyAccountsRepository,
		},
		AddTransaction,
		CreateAccount,
	],
})
export class AccountsModule {}
