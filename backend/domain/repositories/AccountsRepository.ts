import type { CreateAccountDTO } from "~/dtos/CreateAccount.dto";
import type { FindAccountDTO } from "~/dtos/FindAccount.dto";
import type { Account } from "~/entities";

export abstract class AccountsRepository {
	abstract create(data: CreateAccountDTO): Promise<Account>;
	abstract find(data: FindAccountDTO): Promise<Account | undefined>;
	abstract findById(id: string): Promise<Account | undefined>;
}
