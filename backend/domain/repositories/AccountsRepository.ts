import type { CreateAccountDTO, DeleteAccountDTO, EditAccountDTO } from "~/dtos";
import type { FindAccountDTO } from "~/dtos/accounts/FindAccount.dto";
import type { Account } from "~/entities";

export interface TransactionsAndEvents {
	events: { amount: number }[];
	transactions: {
		amount: number;
		destinationId: string | null;
		id: string;
		income: Record<string, any> | null;
		originId: string | null;
	}[];
}

export abstract class AccountsRepository {
	abstract create(data: CreateAccountDTO): Promise<Account>;
	abstract delete(data: DeleteAccountDTO): Promise<void>;
	abstract findAllByRecentlyUsed(): Promise<Account[]>;
	abstract findAllTransactionsAndEvents(email: string): Promise<TransactionsAndEvents>;
	abstract findById(id: string): Promise<Account | undefined>;
	abstract findExisting(data: FindAccountDTO): Promise<Account | undefined>;
	abstract update(id: string, data: Omit<EditAccountDTO, "accountId">): Promise<Account>;
}
