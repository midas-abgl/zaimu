import { type Account, type AccountsRepository, type CreateAccountDTO, HttpException } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class CreateAccount {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute(data: CreateAccountDTO): Promise<Account> {
		const existingAccount = await this.accountsRepository.find(data);
		if (existingAccount) {
			throw new HttpException("A conta de origem não foi encontrada.", StatusCodes.CONFLICT);
		}

		const account = await this.accountsRepository.create(data);

		return account;
	}
}
