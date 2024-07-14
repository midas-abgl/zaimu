import type { CreateAccountDTO, DeleteAccountDTO } from "~/dtos";
import type { FindAccountDTO } from "~/dtos/accounts/FindAccount.dto";
import type { Account } from "~/entities";

export abstract class AccountsRepository {
	abstract create(data: CreateAccountDTO): Promise<Account>;
	abstract delete(data: DeleteAccountDTO): Promise<void>;
	abstract find(data: FindAccountDTO): Promise<Account | undefined>;
}
