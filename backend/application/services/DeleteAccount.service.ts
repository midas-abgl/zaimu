import { type Account, type AccountsRepository, type DeleteAccountDTO, HttpException } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class DeleteAccount {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute({ company }: DeleteAccountDTO): Promise<void> {
		const existingAccount = await this.accountsRepository.find(company);
		if (!existingAccount) {
			throw new HttpException("Esta conta não existe.", StatusCodes.NOT_FOUND);
		}

		await this.accountsRepository.delete(company);
	}
}
