import type { Transaction } from "@database/types";
import type { AddTransactionDTO } from "@modules/accounts/dtos/AddTransaction.dto";
// biome-ignore lint/style/useImportType: Breaks NestJS
import { AddTransaction } from "@modules/accounts/services/AddTransaction.service";
import { Body, Controller, Post } from "@nestjs/common";

@Controller("transactions")
export class IcomesController {
	constructor(private addIcome: AddTransaction) {}

	@Post() public async postAccounts(@Body() body: AddTransactionDTO): Promise<Transaction> {
		const account = await this.addIcome.execute(body);

		return account;
	}
}
