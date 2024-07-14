import { type AccountsRepository, type DeleteAccountDTO, HttpException } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class DeleteAccount {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute(data: DeleteAccountDTO): Promise<void> {
		const existingAccount = await this.accountsRepository.findExisting(data);
		if (!existingAccount) {
			throw new HttpException("Esta conta não existe.", StatusCodes.NOT_FOUND);
		}

		await this.accountsRepository.delete(data);
	}
}
