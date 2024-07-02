import type { Account } from "@database/types";
import type { Selectable } from "kysely";

export type FindAccountDTO = Pick<Selectable<Account>, "company" | "type">;
