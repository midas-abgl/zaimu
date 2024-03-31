import type { Account } from "@database/types";
import { IsNotEmpty, IsString } from "class-validator";
import type { Insertable } from "kysely";

export class CreateAccountDTO implements Insertable<Account> {
	@IsNotEmpty()
	@IsString()
	name!: string;
}
