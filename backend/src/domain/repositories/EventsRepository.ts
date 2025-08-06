import type { EditEventDTO, RegisterEventDTO } from "~/dtos";
import type { Event, LoanPayment } from "~/entities";

export abstract class EventsRepository {
	abstract create(data: RegisterEventDTO): Promise<Event>;
	abstract findAllByDate(): Promise<Event[]>;
	abstract findById(id: string): Promise<Event | undefined>;
	abstract findLoanPayments(id: string): Promise<LoanPayment[]>;
	abstract delete(id: string): Promise<void>;
	abstract update(id: string, data: Omit<EditEventDTO, "eventId">): Promise<Event>;
}
