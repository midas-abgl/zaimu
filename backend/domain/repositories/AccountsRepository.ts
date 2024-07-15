import type { CreateAccountDTO, DeleteAccountDTO, EditAccountDTO } from "~/dtos";
import type { FindAccountDTO } from "~/dtos/accounts/FindAccount.dto";
import type { Account } from "~/entities";

export abstract class AccountsRepository {
	abstract create(data: CreateAccountDTO): Promise<Account>;
	abstract delete(data: DeleteAccountDTO): Promise<void>;
	abstract findAllByRecentlyUsed(): Promise<Account[]>;
	abstract findById(id: string): Promise<Account | undefined>;
	abstract findExisting(data: FindAccountDTO): Promise<Account | undefined>;
	abstract update(id: string, data: Omit<EditAccountDTO, "accountId">): Promise<Account>;
}
