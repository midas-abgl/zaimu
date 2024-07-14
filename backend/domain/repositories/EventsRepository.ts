import type { EditEventDTO, RegisterEventDTO } from "~/dtos";
import type { Event } from "~/entities";

export abstract class EventsRepository {
	abstract create(data: RegisterEventDTO): Promise<Event>;
	abstract findById(id: string): Promise<Event | undefined>;
	abstract delete(id: string): Promise<void>;
	abstract update(id: string, data: Omit<EditEventDTO, "eventId">): Promise<Event>;
}
