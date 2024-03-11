import type { Account } from "@database/types";
import { Injectable } from "@nestjs/common";
import type { CreateAccountDTO } from "../dtos/CreateAccount.dto";
import type AccountsRepository from "../repositories/accounts.repository";

@Injectable()
export default class CreateAccount {
	constructor(private accountsRepository: AccountsRepository) {}

	public async execute(data: CreateAccountDTO): Promise<Account> {
		const account = await this.accountsRepository.create(data);

		return account;
	}
}
