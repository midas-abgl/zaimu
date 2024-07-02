import type { Transaction } from "@database/types";
import { HttpException } from "@shared/errors";
import { StatusCodes } from "http-status-codes";
import type { Selectable } from "kysely";
import type { AddTransactionDTO } from "../dtos/AddTransaction.dto";
import type { AccountsRepository } from "../repositories/accounts.repository";

export class AddTransaction {
	constructor(private accountsRepository: AccountsRepository) {}

	public async execute({
		destinationId,
		originId,
		...data
	}: AddTransactionDTO): Promise<Selectable<Transaction>> {
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
