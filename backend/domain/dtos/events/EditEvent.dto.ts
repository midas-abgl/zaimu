export interface EditEventDTO {
	accountId?: string;
	amount?: number;
	date?: Date;
	description?: string;
	details?: Record<string, any>;
	eventId: string;
	type?: string;
}
