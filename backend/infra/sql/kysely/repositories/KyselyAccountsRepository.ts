import type { AccountsRepository, CreateAccountDTO } from "@zaimu/domain";
import type { Kysely, Selectable } from "kysely";
import type { Account, DB } from "../types";

export class KyselyAccountsRepository implements AccountsRepository {
	constructor(private readonly db: Kysely<DB>) {}

	public async create(data: CreateAccountDTO): Promise<Selectable<Account>> {
		const account = await this.db.insertInto("Account").values(data).returningAll().executeTakeFirstOrThrow();

		return account;
	}

	public async delete(company: string): Promise<void> {
		await this.db.deleteFrom("Account").where("company", "=", company).execute();
	}

	public async find(company: string): Promise<Selectable<Account> | undefined> {
		const account = await this.db
			.selectFrom("Account")
			.selectAll()
			.where("company", "=", company)
			.executeTakeFirst();

		return account;
	}
}
