import { randomUUID } from "node:crypto";
import type { Account } from "@database/types";
import type { CreateAccountDTO } from "@modules/accounts/dtos/CreateAccount.dto";
import { Injectable } from "@nestjs/common";
import type { AccountsRepository } from "../accounts.repository";

@Injectable()
export class FakeAccountsRepository implements AccountsRepository {
	private accounts: Account[] = [];

	public async create(data: CreateAccountDTO): Promise<Account> {
		const account = {
			...data,
			id: randomUUID(),
			createdAt: new Date(),
			updatedAt: new Date(),
		} as unknown as Account;

		this.accounts.push(account);

		return account;
	}
}
