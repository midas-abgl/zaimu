import type { UUID } from "node:crypto";

export interface AddTransactionDTO {
	amount: number;
	categories?: string[];
	date: string;
	description?: string;
	destinationId?: UUID;
	originId?: UUID;
	recurrence?: string;
	repeatCount?: number;
}
