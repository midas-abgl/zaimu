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
		if (!destinationId && !originId) {
			throw new HttpException(
				"Envie uma conta de origem ou destino para esta transação.",
				StatusCodes.BAD_REQUEST,
			);
		}

		if (originId) {
			const foundOrigin = await this.accountsRepository.findById(originId);
			if (!foundOrigin) {
				throw new HttpException("A conta de origem não foi encontrada.", StatusCodes.NOT_FOUND);
			}
		}

		if (destinationId) {
			const foundDestination = await this.accountsRepository.findById(destinationId);
			if (!foundDestination) {
				throw new HttpException("A conta de destino não foi encontrada.", StatusCodes.NOT_FOUND);
			}
		}

		const transaction = await this.accountsRepository.addTransaction({ destinationId, originId, ...data });

		return transaction;
	}
}
