import type { Account, Transaction } from "@database/types";
import type { Selectable } from "kysely";
import type { CreateAccountDTO } from "../dtos/CreateAccount.dto";
import type { FindAccountDTO } from "../dtos/FindAccount.dto";
import type { AddTransactionDTO } from "./../dtos/AddTransaction.dto";

export abstract class AccountsRepository {
	abstract addTransaction(data: AddTransactionDTO): Promise<Selectable<Transaction>>;
	abstract create(data: CreateAccountDTO): Promise<Selectable<Account>>;
	abstract find(data: FindAccountDTO): Promise<Selectable<Account> | undefined>;
	abstract findById(id: string): Promise<Selectable<Account> | undefined>;
}
