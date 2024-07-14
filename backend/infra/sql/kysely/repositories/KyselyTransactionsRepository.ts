import type { AddTransactionDTO, TransactionsRepository } from "@zaimu/domain";
import { type Kysely, type Selectable, sql } from "kysely";
import type { TransactionSelectable } from "../entities";
import type { DB } from "../types";

export class KyselyTransactionsRepository implements TransactionsRepository {
	constructor(private readonly db: Kysely<DB>) {}

	public async create(data: AddTransactionDTO): Promise<TransactionSelectable> {
		const transaction = await this.db
			.insertInto("Transaction")
			.values(data)
			.returningAll()
			.executeTakeFirstOrThrow();

		return transaction;
	}

	public async delete(id: string): Promise<void> {
		await this.db.deleteFrom("Transaction").where("id", "=", id).execute();
	}

	public async findById(id: string): Promise<TransactionSelectable | undefined> {
		const transaction = await this.db
			.selectFrom("Transaction")
			.selectAll()
			.where("id", "=", id)
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
