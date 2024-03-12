import type { Account } from "@database/types";
import type { CreateAccountDTO } from "../dtos/CreateAccount.dto";

export abstract class AccountsRepository {
	abstract create(data: CreateAccountDTO): Promise<Account>;
}
