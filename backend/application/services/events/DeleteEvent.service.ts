import { type DeleteEventDTO, type EventsRepository, HttpException } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class DeleteEvent {
	constructor(private readonly eventsRepository: EventsRepository) {}

	public async execute({ eventId }: DeleteEventDTO): Promise<void> {
		const existingEvent = await this.eventsRepository.findById(eventId);
		if (!existingEvent) {
			throw new HttpException("Este evento não foi encontrado.", StatusCodes.NOT_FOUND);
		}

		await this.eventsRepository.delete(eventId);
	}
}
