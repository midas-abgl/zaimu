import type { Account, DB, Transaction } from "@database/types";
import type { AddTransactionDTO } from "@modules/accounts/dtos/AddTransaction.dto";
import type { CreateAccountDTO } from "@modules/accounts/dtos/CreateAccount.dto";
import type { FindAccountDTO } from "@modules/accounts/dtos/FindAccount.dto";
import type { AccountsRepository } from "@modules/accounts/repositories/accounts.repository";
import type { Kysely, Selectable } from "kysely";

export class KyselyAccountsRepository implements AccountsRepository {
	constructor(private readonly db: Kysely<DB>) {}

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

	public async find({ company, type }: FindAccountDTO): Promise<Selectable<Account> | undefined> {
		const account = await this.db
			.selectFrom("Account")
			.selectAll()
			.where("company", "=", company)
			.where("type", "=", type)
			.executeTakeFirst();

		return account;
	}

	public async findById(id: string): Promise<Selectable<Account> | undefined> {
		const account = await this.db.selectFrom("Account").selectAll().where("id", "=", id).executeTakeFirst();

		return account;
	}
}
