import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
	? ColumnType<S, I | undefined, U>
	: ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Account = {
	id: Generated<string>;
	userEmail: string;
	company: string;
	createdAt: Generated<Timestamp>;
	updatedAt: Generated<Timestamp>;
};
export type Event = {
	id: Generated<string>;
	type: string;
	accountId: string;
	amount: number;
	date: Timestamp;
	description: string | null;
	details: unknown;
	createdAt: Generated<Timestamp>;
	updatedAt: Generated<Timestamp>;
};
export type Transaction = {
	id: Generated<string>;
	amount: number;
	date: Timestamp;
	description: string | null;
	categories: string[];
	recurrence: string | null;
	repeatCount: number | null;
	originId: string | null;
	destinationId: string | null;
	createdAt: Generated<Timestamp>;
	updatedAt: Generated<Timestamp>;
};
export type User = {
	email: string;
	password: string;
	createdAt: Generated<Timestamp>;
	updatedAt: Generated<Timestamp>;
};
export type DB = {
	Account: Account;
	Event: Event;
	Transaction: Transaction;
	User: User;
};
