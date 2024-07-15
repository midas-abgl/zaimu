import { type Account, type AccountsRepository, type EditAccountDTO, HttpException } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class EditAccount {
	constructor(private readonly accountsRepository: AccountsRepository) {}

	public async execute({ accountId, ...data }: EditAccountDTO): Promise<Account> {
		const existingAccount = await this.accountsRepository.findById(accountId);
		if (!existingAccount) {
			throw new HttpException("Esta conta não foi encontrada.", StatusCodes.NOT_FOUND);
		}

		const updatedAccount = await this.accountsRepository.update(accountId, data);

		return updatedAccount;
	}
}
