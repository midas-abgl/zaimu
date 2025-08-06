import { type DeleteTransactionDTO, HttpException, type TransactionsRepository } from "@domain";
import { StatusCodes } from "http-status-codes";

export class DeleteTransaction {
	constructor(private readonly transactionsRepository: TransactionsRepository) {}

	public async execute({ transactionId }: DeleteTransactionDTO): Promise<void> {
		const existingTransaction = await this.transactionsRepository.findById(transactionId);
		if (!existingTransaction) {
			throw new HttpException("Esta transação não existe.", StatusCodes.NOT_FOUND);
		}

		await this.transactionsRepository.delete(transactionId);
	}
}
