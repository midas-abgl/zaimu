import type { Transaction } from "@database/types";
import type { Insertable } from "kysely";

export type AddTransactionDTO = Insertable<Transaction>;
