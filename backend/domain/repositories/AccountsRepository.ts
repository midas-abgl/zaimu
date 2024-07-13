import type { AddTransactionDTO } from "~/dtos/AddTransaction.dto";
import type { CreateAccountDTO } from "~/dtos/CreateAccount.dto";
import type { FindAccountDTO } from "~/dtos/FindAccount.dto";
import type { Account, Transaction } from "~/entities";

export abstract class AccountsRepository {
	abstract addTransaction(data: AddTransactionDTO): Promise<Transaction>;
	abstract create(data: CreateAccountDTO): Promise<Account>;
	abstract find(data: FindAccountDTO): Promise<Account | undefined>;
	abstract findById(id: string): Promise<Account | undefined>;
	abstract findAllTransactionCategories(): Promise<string[]>;
}
