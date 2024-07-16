import type { HashProvider, JwtProvider } from "@hyoretsu/providers";
import { type AuthenticateUserDTO, HttpException, type UsersRepository } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class AuthenticateUser {
	constructor(
		private readonly hashProvider: HashProvider,
		private readonly jwtProvider: JwtProvider,
		private readonly usersRepository: UsersRepository,
	) {}

	public async execute({ email, password }: AuthenticateUserDTO): Promise<string> {
		const existingUser = await this.usersRepository.findByEmail(email);
		if (!existingUser) {
			throw new HttpException("Este usuário não existe", StatusCodes.CONFLICT);
		}

		const passwordMatches = await this.hashProvider.compareHash(password, existingUser.password);
		if (!passwordMatches) {
			throw new HttpException("Senha incorreta", StatusCodes.FORBIDDEN);
		}

		const jwt = await this.jwtProvider.sign({ subject: email });

		return jwt;
	}
}
