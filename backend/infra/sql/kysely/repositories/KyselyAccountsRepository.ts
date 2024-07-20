import type {
	AccountsRepository,
	CreateAccountDTO,
	EditAccountDTO,
	FindAccountDTO,
	TransactionsAndEvents,
} from "@zaimu/domain";
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

	public async findAllTransactionsAndEvents(email: string): Promise<TransactionsAndEvents> {
		const events = await this.db
			.selectFrom(["Account as a", "Event as e"])
			.select("e.amount")
			.where("a.userEmail", "=", email)
			.whereRef("e.accountId", "=", "a.id")
			.execute();

		const transactions = await this.db
			.selectFrom("Account as a")
			.where("a.userEmail", "=", email)
			.innerJoin("Transaction as t", join =>
				join.on(eb =>
					eb.or([eb("t.destinationId", "=", eb.ref("a.id")), eb("t.originId", "=", eb.ref("a.id"))]),
				),
			)
			.select(["t.id", "t.amount", "t.originId", "t.destinationId", "a.income"])
			.distinct()
			.execute();

		return {
			events,
			transactions,
		};
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

	public async update(id: string, data: Omit<EditAccountDTO, "accountId">): Promise<AccountSelectable> {
		const event = await this.db
			.updateTable("Account")
			.set(data)
			.where("id", "=", id)
			.returningAll()
			.executeTakeFirst();

		return event!;
	}
}
