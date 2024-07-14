import type { CreateAccountDTO } from "~/dtos";
import type { Account } from "~/entities";

export abstract class AccountsRepository {
	abstract create(data: CreateAccountDTO): Promise<Account>;
	abstract delete(company: string): Promise<void>;
	abstract find(company: string): Promise<Account | undefined>;
}
