import { IsNotEmpty, IsNumber, IsString, IsUUID } from "class-validator/types/decorator/decorators";

export class AddTransactionDTO {
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
