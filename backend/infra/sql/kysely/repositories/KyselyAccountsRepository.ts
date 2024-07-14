import type { AccountsRepository, CreateAccountDTO, DeleteAccountDTO, FindAccountDTO } from "@zaimu/domain";
import type { Kysely, Selectable } from "kysely";
import type { Account, DB } from "../types";

export class KyselyAccountsRepository implements AccountsRepository {
	constructor(private readonly db: Kysely<DB>) {}

	public async create(data: CreateAccountDTO): Promise<Selectable<Account>> {
		const account = await this.db.insertInto("Account").values(data).returningAll().executeTakeFirstOrThrow();

		return account;
	}

	public async delete({ company, userEmail }: DeleteAccountDTO): Promise<void> {
		await this.db
			.deleteFrom("Account")
			.where(eb => eb.and([eb("company", "=", company), eb("userEmail", "=", userEmail)]))
			.execute();
	}

	public async findById(id: string): Promise<Selectable<Account> | undefined> {
		const account = await this.db.selectFrom("Account").selectAll().where("id", "=", id).executeTakeFirst();

		return account;
	}

	public async findExisting({
		company,
		userEmail,
	}: FindAccountDTO): Promise<Selectable<Account> | undefined> {
		const account = await this.db
			.selectFrom("Account")
			.selectAll()
			.where(eb => eb.and([eb("company", "=", company), eb("userEmail", "=", userEmail)]))
			.executeTakeFirst();

		return account;
	}
}
