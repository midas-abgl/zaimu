import type { EventsRepository, RegisterEventDTO } from "@zaimu/domain";
import { type Kysely, sql } from "kysely";
import type { EventSelectable } from "../entities";
import type { DB } from "../types";

export class KyselyEventsRepository implements EventsRepository {
	constructor(private readonly db: Kysely<DB>) {}

	public async create(data: RegisterEventDTO): Promise<EventSelectable> {
		const event = await this.db.insertInto("Event").values(data).returningAll().executeTakeFirstOrThrow();

		return event;
	}
}
