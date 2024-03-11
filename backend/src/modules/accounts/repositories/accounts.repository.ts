import type { Account } from "@database/types";
import type { CreateAccountDTO } from "../dtos/CreateAccount.dto";

export default abstract class AccountsRepository {
	abstract create(data: CreateAccountDTO): Promise<Account>;
}
