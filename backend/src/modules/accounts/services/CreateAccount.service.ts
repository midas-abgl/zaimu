import type { Account } from "@database/types";
import type { Selectable } from "kysely";
import type { CreateAccountDTO } from "../dtos/CreateAccount.dto";
import type { AccountsRepository } from "../repositories/accounts.repository";

export class CreateAccount {
	constructor(private accountsRepository: AccountsRepository) {}

	public async execute(data: CreateAccountDTO): Promise<Selectable<Account>> {
		const existingAccount = await this.accountsRepository.find(data);
		if (existingAccount) {
			throw new Error();
		}

		const account = await this.accountsRepository.create(data);

		return account;
	}
}
