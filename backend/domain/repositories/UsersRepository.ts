import type { CreateUserDTO } from "~/dtos";
import type { User } from "~/entities";

export abstract class UsersRepository {
	abstract create(data: CreateUserDTO): Promise<User>;
	abstract findByEmail(email: string): Promise<User | undefined>;
}
