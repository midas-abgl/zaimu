import type { Account } from "@database/types";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { Insertable } from "kysely";

export class CreateAccountDTO implements Insertable<Account> {
	@IsNotEmpty()
	@IsString()
	@MaxLength(70)
	company!: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(30)
	type!: string;
}