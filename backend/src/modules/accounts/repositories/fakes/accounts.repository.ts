import { randomUUID } from "node:crypto";
import type { Account } from "@database/types";
import type { CreateAccountDTO } from "@modules/accounts/dtos/CreateAccount.dto";
import type { Selectable } from "kysely";
import type { AccountsRepository } from "../accounts.repository";

export class FakeAccountsRepository implements AccountsRepository {
	private accounts: Selectable<Account>[] = [];

	public async create(data: CreateAccountDTO): Promise<Selectable<Account>> {
		const account = {
			...data,
			id: randomUUID(),
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.accounts.push(account);

		return account;
	}
}
