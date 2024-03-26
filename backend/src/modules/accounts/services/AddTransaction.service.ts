import type { Transaction } from "@database/types";
import { HttpException, Injectable } from "@nestjs/common";
import { AccountsRepository } from "../repositories/accounts.repository";
import type { AddTransactionDTO } from "../dtos/AddTransaction.dto";


@Injectable()
export class AddTransaction {
	constructor(private accountsRepository: AccountsRepository) {}

	public async execute({destinationId, originId,...data}: AddTransactionDTO): Promise<Transaction> {
        const foundOrigin = await this.accountsRepository.findById(originId);
        if(!foundOrigin){
            throw new HttpException('A conta de origem não foi encontrada.', 404);
        }

        const foundDestination = await this.accountsRepository.findById(destinationId);
        if(!foundDestination){
            throw new HttpException('A conta de destino não foi encontrada.',404);
        }

		const transaction = await this.accountsRepository.addTransaction({destinationId, originId,...data});

		return transaction;
	
    }
}