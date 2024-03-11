import { Module } from "@nestjs/common";
import { AccountsController } from "./infra/http/controllers/accounts.controller";
import KyselyAccountsRepository from "./infra/kysely/repositories/KyselyAccountsRepository";
import AccountsRepository from "./repositories/accounts.repository";
import CreateAccount from "./services/CreateAccount.service";

@Module({
	controllers: [AccountsController],
	providers: [
		{
			provide: AccountsRepository,
			useClass: KyselyAccountsRepository,
		},
		CreateAccount,
	],
})
export default class AccountsModule {}
