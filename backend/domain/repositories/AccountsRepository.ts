import type { CreateAccountDTO, DeleteAccountDTO, FindAccountDTO } from "~/dtos";
import type { Account } from "~/entities";

export abstract class AccountsRepository {
	abstract create(data: CreateAccountDTO): Promise<Account>;
	abstract delete(data: DeleteAccountDTO): Promise<void>;
	abstract find(data: FindAccountDTO): Promise<Account | undefined>;
	abstract findById(id: string): Promise<Account | undefined>;
}
