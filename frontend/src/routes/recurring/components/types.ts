import type { RecurringPayment, Salary, Subscription } from "@/lib/api";

export type RecurringSource = "salary" | "subscription" | "recurring";
export type RecurringDirection = "INCOME" | "EXPENSE";
export type RecurrenceFrequency = Salary["frequency"];

export interface RecurringListItemData {
	accountName?: string;
	active: boolean;
	amount: number;
	day: number | null;
	direction: RecurringDirection;
	frequency: RecurrenceFrequency;
	id: string;
	monthlyAmount: number;
	paymentMethod?: Subscription["paymentMethod"] | RecurringPayment["paymentMethod"];
	source: RecurringSource;
	tags?: RecurringPayment["tags"];
	title: string;
}

export interface RecurringDraft {
	amount: string;
	day: string;
	financialAccountId: string;
	frequency: RecurrenceFrequency;
	name: string;
	paymentMethod: Subscription["paymentMethod"];
	source: RecurringSource;
	startDate: string;
	tagIds: string[];
}
