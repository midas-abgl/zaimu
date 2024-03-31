import type { Transaction } from "@database/types";
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";
import type { Insertable } from "kysely";

export class AddTransactionDTO implements Insertable<Transaction> {
	@IsNotEmpty()
	@IsNumber()
	@Min(0)
	amount!: number;

	@IsNotEmpty()
	@IsDate()
	date!: Date;

	@IsOptional()
	@IsString()
	@MaxLength(65535)
	description?: string;

	@IsNotEmpty()
	@IsString()
	@IsUUID()
	destinationId!: string;

	@IsNotEmpty()
	@IsString()
	@IsUUID()
	originId!: string;
}
