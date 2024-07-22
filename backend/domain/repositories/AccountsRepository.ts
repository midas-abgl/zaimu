import type { CreateAccountDTO, DeleteAccountDTO, EditAccountDTO } from "~/dtos";
import type { FindAccountDTO } from "~/dtos/accounts/FindAccount.dto";
import type { Account } from "~/entities";

export interface IncomeSource {
	id: string;
	income: Record<string, any> | null;
}

export interface TransactionsAndEvents {
	events: {
		id: string;
		amountToPay: number;
		details: Record<string, any>;
		type: string;
	}[];
	transactions: {
		amount: number;
		date: Date;
		destinationId: string | null;
		eventId: string | null;
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
	abstract findIncomeSources(email: string): Promise<IncomeSource[]>;
	abstract findRelevantTransactionsAndEvents(email: string): Promise<TransactionsAndEvents>;
	abstract update(id: string, data: Omit<EditAccountDTO, "accountId">): Promise<Account>;
}
