import type { UUID } from "node:crypto";

export interface AddTransactionDTO {
	amount: string;
	date: string;
	description?: string;
	destinationId: UUID;
	originId: UUID;
}
