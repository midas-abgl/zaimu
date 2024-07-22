import type {
	AccountsRepository,
	CreateAccountDTO,
	EditAccountDTO,
	FindAccountDTO,
	IncomeSource,
	TransactionsAndEvents,
} from "@zaimu/domain";
import { type Kysely, sql } from "kysely";
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
			.selectFrom("Account as a")
			.where("a.userEmail", "=", email)
			.innerJoin("Event as e", "e.accountId", "a.id")
			.select(["e.id", "e.amount as amountToPay", "e.details", "e.type"])
			.execute();

		const transactions = await this.db
			.selectFrom("Account as a")
			.where("a.userEmail", "=", email)
			.innerJoin("Transaction as t", join =>
				join.on(eb =>
					eb.and([
						eb.or([eb("t.destinationId", "=", eb.ref("a.id")), eb("t.originId", "=", eb.ref("a.id"))]),
						eb("t.eventId", "is", null),
					]),
				),
			)
			.select(["t.id", "t.date", "t.amount", "t.eventId", "t.originId", "t.destinationId", "a.income"])
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

	public async findIncomeSources(email: string): Promise<IncomeSource[]> {
		const accounts = await this.db
			.selectFrom("Account")
			.select(["id", "income"])
			.where(eb => eb.and([eb("userEmail", "=", email), eb("income", "is not", null)]))
			.execute();

		return accounts;
	}

	public async findRelevantTransactionsAndEvents(email: string): Promise<TransactionsAndEvents> {
		const startOfCurrentMonth = sql<Date>`date_trunc('month', CURRENT_DATE)`;
		const endOfNextMonth = sql<Date>`date_trunc('month', CURRENT_DATE) + INTERVAL '2 months' - INTERVAL '1 day'`;

		const events = await this.db
			.selectFrom("Account as a")
			.where("a.userEmail", "=", email)
			.innerJoin("Event as e", "e.accountId", "a.id")
			.innerJoin("LoanPayment as lp", join =>
				join.on(eb =>
					eb.and([eb("lp.date", ">=", startOfCurrentMonth), eb("lp.date", "<=", endOfNextMonth)]),
				),
			)
			.where(eb => eb.or([eb("lp.loanId", "is", null), eb("lp.loanId", "=", eb.ref("e.id"))]))
			.select(["e.id", "e.amount as amountToPay", "e.details", "e.type"])
			.groupBy("e.id")
			.execute();

		console.log(
			this.db
				.selectFrom("Account as a")
				.where("a.userEmail", "=", email)
				.innerJoin("Event as e", "e.accountId", "a.id")
				.innerJoin("LoanPayment as lp", join =>
					join.on(eb =>
						eb.and([eb("lp.date", ">=", startOfCurrentMonth), eb("lp.date", "<=", endOfNextMonth)]),
					),
				)
				.where(eb => eb.or([eb("lp.loanId", "is", null), eb("lp.loanId", "=", eb.ref("e.id"))]))
				.select(["e.id", "e.amount as amountToPay", "e.details", "e.type"])
				.groupBy("e.id")
				.compile().sql,
		);

		const transactions = await this.db
			.selectFrom("Account as a")
			.where("a.userEmail", "=", email)
			.innerJoin("Transaction as t", join =>
				join.on(eb =>
					eb.and([
						eb.or([eb("t.destinationId", "=", eb.ref("a.id")), eb("t.originId", "=", eb.ref("a.id"))]),
						eb("t.eventId", "is", null),
					]),
				),
			)
			.where(eb => eb.and([eb("t.date", ">=", startOfCurrentMonth), eb("t.date", "<=", endOfNextMonth)]))
			.select(["t.id", "t.date", "t.amount", "t.eventId", "t.originId", "t.destinationId", "a.income"])
			.distinct()
			.execute();

		return {
			events,
			transactions,
		};
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
