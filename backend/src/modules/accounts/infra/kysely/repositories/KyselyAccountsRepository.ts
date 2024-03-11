import type { Account, DB } from "@database/types";
import type { CreateAccountDTO } from "@modules/accounts/dtos/CreateAccount.dto";
import type AccountsRepository from "@modules/accounts/repositories/accounts.repository";
import { Injectable } from "@nestjs/common";
import type { Kysely } from "kysely";
import { InjectKysely } from "nestjs-kysely";

@Injectable()
export default class KyselyAccountsRepository implements AccountsRepository {
	constructor(@InjectKysely() private readonly db: Kysely<DB>) {}

	public async create(data: CreateAccountDTO): Promise<Account> {
		const account = await this.db.insertInto("Account").values(data).returningAll().executeTakeFirstOrThrow();

		return account as unknown as Account;
	}
}
