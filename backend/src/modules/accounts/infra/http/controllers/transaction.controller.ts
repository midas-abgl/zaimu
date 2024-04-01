import type { Transaction } from "@database/types";
import type { AddTransactionDTO } from "@modules/accounts/dtos/AddTransaction.dto";
// biome-ignore lint/style/useImportType: Breaks NestJS
import { AddTransaction } from "@modules/accounts/services/AddTransaction.service";
import { Body, Controller, Post } from "@nestjs/common";
import type { Selectable } from "kysely";

@Controller("transactions")
export class TransactionsController {
	constructor(private addTransaction: AddTransaction) {}

	@Post()
	public async postTransactions(@Body() body: AddTransactionDTO): Promise<Selectable<Transaction>> {
		const account = await this.addTransaction.execute(body);

		return account;
	}
}
