import type { Account, DB, Transaction } from "@database/types";
import type { AddTransactionDTO } from "@modules/accounts/dtos/AddTransaction.dto";
import type { CreateAccountDTO } from "@modules/accounts/dtos/CreateAccount.dto";
import type { AccountsRepository } from "@modules/accounts/repositories/accounts.repository";
import { Injectable } from "@nestjs/common";
import type { Kysely } from "kysely";
import { InjectKysely } from "nestjs-kysely";

@Injectable()
export class KyselyAccountsRepository implements AccountsRepository {
	constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

	public async create(data: CreateAccountDTO): Promise<Account> {
		const account = await this.db.insertInto("Account").values(data).returningAll().executeTakeFirstOrThrow();

		return account as unknown as Account;
	}

	public async addTransaction(data: AddTransactionDTO): Promise<Transaction> {
		const transaction = await this.db
			.insertInto("Transaction")
			.values(data)
			.returningAll()
			.executeTakeFirstOrThrow();

		return transaction as unknown as Transaction;
	}

	public async findById(id: string): Promise<Account | null> {
		const account = await this.db.selectFrom("Account").selectAll().where("id", "=", id).executeTakeFirst();

		return account as unknown as Account;
	}
}
