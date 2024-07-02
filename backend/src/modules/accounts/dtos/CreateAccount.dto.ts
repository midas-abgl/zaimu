import type { Account } from "@database/types";
import type { Insertable } from "kysely";

export type CreateAccountDTO = Insertable<Account>;
