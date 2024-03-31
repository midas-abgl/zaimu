import type { Account, DB, Transaction } from "@database/types";
import type { AddTransactionDTO } from "@modules/accounts/dtos/AddTransaction.dto";
import type { CreateAccountDTO } from "@modules/accounts/dtos/CreateAccount.dto";
import type { AccountsRepository } from "@modules/accounts/repositories/accounts.repository";
import { Injectable } from "@nestjs/common";
import type { Kysely, Selectable } from "kysely";
import { InjectKysely } from "nestjs-kysely";

@Injectable()
export class KyselyAccountsRepository implements AccountsRepository {
	constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

	public async addTransaction(data: AddTransactionDTO): Promise<Selectable<Transaction>> {
		const transaction = await this.db
			.insertInto("Transaction")
			.values(data)
			.returningAll()
			.executeTakeFirstOrThrow();

		return transaction;
	}

	public async create(data: CreateAccountDTO): Promise<Selectable<Account>> {
		const account = await this.db.insertInto("Account").values(data).returningAll().executeTakeFirstOrThrow();

		return account;
	}

	public async findById(id: string): Promise<Selectable<Account> | undefined> {
		const account = await this.db.selectFrom("Account").selectAll().where("id", "=", id).executeTakeFirst();

		return account;
	}
}
