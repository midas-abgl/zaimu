import { type EditEventDTO, type Event, type EventsRepository, HttpException } from "@zaimu/domain";
import { StatusCodes } from "http-status-codes";

export class EditEvent {
	constructor(private readonly eventsRepository: EventsRepository) {}

	public async execute({ eventId, ...data }: EditEventDTO): Promise<Event> {
		const existingEvent = await this.eventsRepository.findById(eventId);
		if (!existingEvent) {
			throw new HttpException("Este evento não foi encontrado.", StatusCodes.NOT_FOUND);
		}

		const event = await this.eventsRepository.update(eventId, data);

		return event;
	}
}
