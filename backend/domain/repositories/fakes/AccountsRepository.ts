import { randomUUID } from "node:crypto";
import type { CreateAccountDTO } from "~/dtos/CreateAccount.dto";
import type { Account } from "~/entities";
import type { AccountsRepository } from "../AccountsRepository";

export class FakeAccountsRepository implements AccountsRepository {
	private accounts: Account[] = [];

	public async create(data: CreateAccountDTO): Promise<Account> {
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
