export interface AddTransactionDTO {
	amount: number;
	categories?: string[];
	date: Date;
	description?: string;
	destinationId?: string;
	originId?: string;
	recurrence?: string;
	repeatCount?: number;
}
