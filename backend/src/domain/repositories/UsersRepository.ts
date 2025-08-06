import type { CreateUserDTO, EditUserDTO } from "~/dtos";
import type { User } from "~/entities";

export abstract class UsersRepository {
	abstract create(data: CreateUserDTO): Promise<User>;
	abstract findByEmail(email: string): Promise<User | undefined>;
	abstract update(data: EditUserDTO): Promise<User>;
}
