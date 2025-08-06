export interface RegisterEventDTO {
	accountId: string;
	amount: number;
	date: Date;
	description?: string;
	details: Record<string, any>;
	type: string;
}
