import {
	type AccountsRepository,
	type AddTransactionDTO,
	HttpException,
	type Transaction,
} from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class AddTransaction {
	constructor(private accountsRepository: AccountsRepository) {}

	public async execute({ destinationId, originId, ...data }: AddTransactionDTO): Promise<Transaction> {
		const foundOrigin = await this.accountsRepository.findById(originId);
		if (!foundOrigin) {
			throw new HttpException("A conta de origem não foi encontrada.", StatusCodes.NOT_FOUND);
		}

		const foundDestination = await this.accountsRepository.findById(destinationId);
		if (!foundDestination) {
			throw new HttpException("A conta de destino não foi encontrada.", StatusCodes.NOT_FOUND);
		}

		const transaction = await this.accountsRepository.addTransaction({ destinationId, originId, ...data });

		return transaction;
	}
}
