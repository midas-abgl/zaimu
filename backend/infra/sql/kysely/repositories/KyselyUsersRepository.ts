import type { CreateUserDTO, UsersRepository } from "@zaimu/domain";
import type { Kysely } from "kysely";
import type { UserSelectable } from "../entities";
import type { DB } from "../types";

export class KyselyUsersRepository implements UsersRepository {
	constructor(private readonly db: Kysely<DB>) {}

	public async create(data: CreateUserDTO): Promise<UserSelectable> {
		const user = await this.db.insertInto("User").values(data).returningAll().executeTakeFirstOrThrow();

		return user;
	}
	public async findByEmail(email: string): Promise<UserSelectable | undefined> {
		const user = await this.db.selectFrom("User").selectAll().where("email", "=", email).executeTakeFirst();

		return user;
	}
}
