import type { Insertable, Selectable } from "kysely";
import type { Account, Event, LoanPayment, Transaction, User } from "./types";

export type AccountInsertable = Insertable<Account>;
export type AccountSelectable = Selectable<Account>;
export type EventInsertable = Insertable<Event>;
export type EventSelectable = Selectable<Event>;
export type LoanPaymentInsertable = Insertable<LoanPayment>;
export type LoanPaymentSelectable = Selectable<LoanPayment>;
export type TransactionInsertable = Insertable<Transaction>;
export type TransactionSelectable = Selectable<Transaction>;
export type UserInsertable = Insertable<User>;
export type UserSelectable = Selectable<User>;
