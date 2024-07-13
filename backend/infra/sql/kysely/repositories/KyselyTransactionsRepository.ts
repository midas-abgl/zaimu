import type { AddTransactionDTO, TransactionsRepository } from "@zaimu/domain";
import { type Kysely, type Selectable, sql } from "kysely";
import type { DB, Transaction } from "../types";

export class KyselyTransactionsRepository implements TransactionsRepository {
	constructor(private readonly db: Kysely<DB>) {}

	public async create(data: AddTransactionDTO): Promise<Selectable<Transaction>> {
		const transaction = await this.db
			.insertInto("Transaction")
			.values(data)
			.returningAll()
			.executeTakeFirstOrThrow();

		return transaction;
	}

	public async findCategoriesByLastUsed(): Promise<string[]> {
		const transactionCategories = await this.db
			.selectFrom(["Transaction", sql`unnest(categories)`.as("category")])
			// @ts-ignore
			.select("category")
			.distinct()
			.execute();

		return transactionCategories.reverse().map(({ category }) => category);
	}
}
