import {
	type AccountsRepository,
	type AddTransactionDTO,
	HttpException,
	type Transaction,
	type TransactionsRepository,
} from "@zaimu/domain";
import cron from "cron-validate";
import { StatusCodes } from "http-status-codes";

export class AddTransaction {
	constructor(
		private readonly accountsRepository: AccountsRepository,
		private readonly transactionsRepository: TransactionsRepository,
	) {}

	public async execute({
		destinationId,
		originId,
		recurrence,
		repeatCount,
		...data
	}: AddTransactionDTO): Promise<Transaction> {
		if (!destinationId && !originId) {
			throw new HttpException(
				"Envie uma conta de origem ou destino para esta transação.",
				StatusCodes.BAD_REQUEST,
			);
		}

		if (repeatCount) {
			if (!recurrence) {
				throw new HttpException(
					"Você deve informar um padrão de recorrência para limitar as vezes que ele ocorrerá.",
					StatusCodes.BAD_REQUEST,
				);
			}

			if (repeatCount < 1) {
				throw new HttpException("Quantidade de repetições inválida.", StatusCodes.BAD_REQUEST);
			}
		}

		if (recurrence && !cron(recurrence).isValid()) {
			throw new HttpException(
				"Padrão de recorrência inválido. Ela deve estar no formato tradicional de um cron job.",
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

		const transaction = await this.transactionsRepository.create({ destinationId, originId, ...data });

		return transaction;
	}
}
