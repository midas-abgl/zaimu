import {
	type EditTransactionDTO,
	HttpException,
	type Transaction,
	type TransactionsRepository,
} from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class EditTransaction {
	constructor(private readonly transactionsRepository: TransactionsRepository) {}

	public async execute({ transactionId, ...data }: EditTransactionDTO): Promise<Transaction> {
		const existingTransaction = await this.transactionsRepository.findById(transactionId);
		if (!existingTransaction) {
			throw new HttpException("Esta transação não foi encontrada.", StatusCodes.NOT_FOUND);
		}

		const transaction = await this.transactionsRepository.update(transactionId, data);

		return transaction;
	}
}
