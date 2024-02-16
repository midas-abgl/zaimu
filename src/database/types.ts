import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
	? ColumnType<S, I | undefined, U>
	: ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Account = {
	id: Generated<string>;
	name: string;
	createdAt: Generated<Timestamp>;
	updatedAt: Generated<Timestamp>;
};
export type Expense = {
	id: Generated<string>;
	amount: string;
	date: Timestamp;
	createdAt: Generated<Timestamp>;
	updatedAt: Generated<Timestamp>;
};
export type DB = {
	Account: Account;
	Expense: Expense;
};
