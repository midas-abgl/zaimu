export interface AddTransactionDTO {
	amount: number;
	categories: string[];
	date: Date;
	description?: string;
	destination?: string;
	origin?: string;
	recurrence?: string;
	repeatCount?: number;
}
