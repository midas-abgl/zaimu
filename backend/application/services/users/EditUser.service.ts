import type { HashProvider } from "@hyoretsu/providers";
import { type EditUserDTO, HttpException, type User, type UsersRepository } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class EditUser {
	constructor(
		private readonly hashProvider: HashProvider,
		private readonly usersRepository: UsersRepository,
	) {}

	public async execute({ email, password }: EditUserDTO): Promise<User> {
		const existingUser = await this.usersRepository.findByEmail(email);
		if (!existingUser) {
			throw new HttpException("Este usuário não foi encontrado", StatusCodes.CONFLICT);
		}

		const passwordHash = await this.hashProvider.generateHash(password);

		const updatedUser = await this.usersRepository.update({
			email,
			password: passwordHash,
		});

		return updatedUser;
	}
}
