import type { AccountsRepository, CreateAccountDTO, FindAccountDTO } from "@zaimu/domain";
import type { Kysely, Selectable } from "kysely";
import type { Account, DB } from "../types";

export class KyselyAccountsRepository implements AccountsRepository {
	constructor(private readonly db: Kysely<DB>) {}

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
