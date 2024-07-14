import type { RegisterEventDTO } from "~/dtos";
import type { Event } from "~/entities";

export abstract class EventsRepository {
	abstract create(data: RegisterEventDTO): Promise<Event>;
}
