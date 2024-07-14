import type { AccountsRepository, CreateAccountDTO, FindAccountDTO } from "@zaimu/domain";
import type { Kysely } from "kysely";
import type { AccountSelectable } from "../entities";
import type { DB } from "../types";

export class KyselyAccountsRepository implements AccountsRepository {
	constructor(private readonly db: Kysely<DB>) {}

	public async create(data: CreateAccountDTO): Promise<AccountSelectable> {
		const account = await this.db.insertInto("Account").values(data).returningAll().executeTakeFirstOrThrow();

		return account;
	}

	public async delete(id: string): Promise<void> {
		await this.db.deleteFrom("Account").where("id", "=", id).execute();
	}

	public async findAllByRecentlyUsed(): Promise<AccountSelectable[]> {
		const accounts = await this.db.selectFrom("Account").selectAll().orderBy("updatedAt desc").execute();

		return accounts;
	}

	public async findById(id: string): Promise<AccountSelectable | undefined> {
		const account = await this.db.selectFrom("Account").selectAll().where("id", "=", id).executeTakeFirst();

		return account;
	}

	public async findExisting({ company, userEmail }: FindAccountDTO): Promise<AccountSelectable | undefined> {
		const account = await this.db
			.selectFrom("Account")
			.selectAll()
			.where(eb => eb.and([eb("company", "=", company), eb("userEmail", "=", userEmail)]))
			.executeTakeFirst();

		return account;
	}
}
