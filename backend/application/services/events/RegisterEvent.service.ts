import {
	type AccountsRepository,
	type Event,
	EventTypes,
	type EventsRepository,
	HttpException,
	type RegisterEventDTO,
} from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class RegisterEvent {
	constructor(
		private readonly accountsRepository: AccountsRepository,
		private readonly eventsRepository: EventsRepository,
	) {}

	public async execute({ accountId, type, ...data }: RegisterEventDTO): Promise<Event> {
		const existingAccount = await this.accountsRepository.findById(accountId);
		if (!existingAccount) {
			throw new HttpException("Esta conta não foi encontrada.", StatusCodes.NOT_FOUND);
		}

		if (!EventTypes.includes(type)) {
			throw new HttpException("O tipo de evento enviado não é suportado.", StatusCodes.BAD_REQUEST);
		}

		const transaction = await this.eventsRepository.create({ accountId, type, ...data });

		return transaction;
	}
}
