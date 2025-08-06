import type { Event, EventsRepository } from "@domain";

export class ListEvents {
	constructor(private readonly eventsRepository: EventsRepository) {}

	public async execute(): Promise<Event[]> {
		const events = await this.eventsRepository.findAllByDate();

		return events;
	}
}
