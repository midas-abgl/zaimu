import type { Transaction } from "@database/types";
import { HttpException, Injectable } from "@nestjs/common";
import type { Selectable } from "kysely";
import type { AddTransactionDTO } from "../dtos/AddTransaction.dto";
// biome-ignore lint/style/useImportType: Breaks NestJS
import { AccountsRepository } from "../repositories/accounts.repository";

@Injectable()
export class AddTransaction {
	constructor(private accountsRepository: AccountsRepository) {}

	public async execute({
		destinationId,
		originId,
		...data
	}: AddTransactionDTO): Promise<Selectable<Transaction>> {
		const foundOrigin = await this.accountsRepository.findById(originId);
		if (!foundOrigin) {
			throw new HttpException("A conta de origem não foi encontrada.", 404);
		}

		const foundDestination = await this.accountsRepository.findById(destinationId);
		if (!foundDestination) {
			throw new HttpException("A conta de destino não foi encontrada.", 404);
		}

		const transaction = await this.accountsRepository.addTransaction({ destinationId, originId, ...data });

		return transaction;
	}
}
