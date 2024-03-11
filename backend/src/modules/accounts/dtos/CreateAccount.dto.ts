import { IsNotEmpty, IsString } from "class-validator";

export class CreateAccountDTO {
	@IsNotEmpty()
	@IsString()
	name!: string;
}
