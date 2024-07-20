import { type Account, type AccountsRepository, type CreateAccountDTO, HttpException } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class CreateAccount {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute({ company, userEmail, ...data }: CreateAccountDTO): Promise<Account> {
		const existingAccount = await this.accountsRepository.findExisting({ company, userEmail });
		if (existingAccount) {
			throw new HttpException("Esta conta já existe", StatusCodes.CONFLICT);
		}

		const account = await this.accountsRepository.create({
			...data,
			company,
			userEmail,
		});

		return account;
	}
}
