import type { Account } from "@database/types";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import type { Selectable } from "kysely";
import type { CreateAccountDTO } from "../dtos/CreateAccount.dto";
// biome-ignore lint/style/useImportType: Breaks NestJS
import { AccountsRepository } from "../repositories/accounts.repository";

@Injectable()
export class CreateAccount {
	constructor(private accountsRepository: AccountsRepository) {}

	public async execute(data: CreateAccountDTO): Promise<Selectable<Account>> {
		const existingAccount = await this.accountsRepository.find(data);
		if (existingAccount) {
			throw new HttpException("Essa conta já existe.", HttpStatus.CONFLICT);
		}

		const account = await this.accountsRepository.create(data);

		return account;
	}
}