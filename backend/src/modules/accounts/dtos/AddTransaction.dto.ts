import type { Transaction } from "@database/types";
import { IsNotEmpty, IsNumber, IsString, IsUUID } from "class-validator";
import type { Insertable } from "kysely";

export class AddTransactionDTO implements Insertable<Transaction> {
	@IsNotEmpty()
	@IsString()
	@IsUUID()
	originId!: string;

	@IsNotEmpty()
	@IsString()
	@IsUUID()
	destinationId!: string;

	@IsNotEmpty()
	@IsNumber()
	value!: number;
}
