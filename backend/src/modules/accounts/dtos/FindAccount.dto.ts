import type { Account } from "@database/types";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { Selectable } from "kysely";

export class FindAccountDTO implements Pick<Selectable<Account>, "company" | "type"> {
	@IsNotEmpty()
	@IsString()
	@MaxLength(70)
	company!: string;

	@IsNotEmpty()
	@IsString()
	@MaxLength(30)
	type!: string;
}
