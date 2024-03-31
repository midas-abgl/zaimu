import type { Account } from "@database/types";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { Insertable } from "kysely";

export class CreateAccountDTO implements Insertable<Account> {
	@IsNotEmpty()
	@IsString()
	@MaxLength(65535)
	name!: string;
}
