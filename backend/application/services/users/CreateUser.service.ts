import type { HashProvider } from "@hyoretsu/providers";
import { type CreateUserDTO, HttpException, type User, type UsersRepository } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class CreateUser {
	constructor(
		private readonly hashProvider: HashProvider,
		private readonly usersRepository: UsersRepository,
	) {}

	public async execute({ email, password }: CreateUserDTO): Promise<User> {
		const existingUser = await this.usersRepository.findByEmail(email);
		if (existingUser) {
			throw new HttpException("Este usuário já existe", StatusCodes.CONFLICT);
		}

		const passwordHash = await this.hashProvider.generateHash(password);

		const user = await this.usersRepository.create({
			email,
			password: passwordHash,
		});

		return user;
	}
}
