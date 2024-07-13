import type { AccountsRepository, AddTransactionDTO, CreateAccountDTO, FindAccountDTO } from "@zaimu/domain";
import { type Kysely, type Selectable, sql } from "kysely";
import type { Account, DB, Transaction } from "../types";

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

	public async findTransactionCategoriesByLastUsed(): Promise<string[]> {
		const transactionCategories = await this.db
			.selectFrom(["Transaction", sql`unnest(categories)`.as("category")])
			// @ts-ignore
			.select("category")
			.distinct()
			.execute();

		return transactionCategories.reverse().map(({ category }) => category);
	}
}
