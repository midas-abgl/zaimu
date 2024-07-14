import { type AccountsRepository, type DeleteAccountDTO, HttpException } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class DeleteAccount {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute({ accountId }: DeleteAccountDTO): Promise<void> {
		const existingAccount = await this.accountsRepository.findExisting(accountId);
		if (!existingAccount) {
			throw new HttpException("Esta conta não existe.", StatusCodes.NOT_FOUND);
		}

		await this.accountsRepository.delete(accountId);
	}
}
