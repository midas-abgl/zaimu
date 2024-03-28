import type { Account } from "@database/types";
import type { CreateAccountDTO } from "@modules/accounts/dtos/CreateAccount.dto";
// biome-ignore lint/style/useImportType: Breaks NestJS
import { CreateAccount } from "@modules/accounts/services/CreateAccount.service";
import { Body, Controller, Post } from "@nestjs/common";

@Controller("accounts")
export class AccountsController {
	constructor(private createAccount: CreateAccount) {}

	@Post() public async postAccounts(@Body() body: CreateAccountDTO): Promise<Account> {
		const account = await this.createAccount.execute(body);

		return account;
	}
}
