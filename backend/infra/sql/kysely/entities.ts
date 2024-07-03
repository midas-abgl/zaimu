import type { Insertable, Selectable } from "kysely";
import type { Account, Transaction } from "./types";

export type AccountInsertable = Insertable<Account>;
export type AccountSelectable = Selectable<Account>;
export type TransactionInsertable = Insertable<Transaction>;
export type TransactionSelectable = Selectable<Transaction>;
