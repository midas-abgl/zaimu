import type { AddTransactionDTO } from './../dtos/AddTransaction.dto';
import type { Account, Transaction} from "@database/types";
import type { CreateAccountDTO } from "../dtos/CreateAccount.dto";

export abstract class AccountsRepository {
    abstract addTransaction(data: AddTransactionDTO): Promise<Transaction>;
	abstract create(data: CreateAccountDTO): Promise<Account>;
    abstract findById(id: string): Promise<Account | null>;
}
