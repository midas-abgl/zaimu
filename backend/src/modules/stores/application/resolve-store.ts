import { normalizeStoreName } from "~/modules/stores/domain/normalize-store-name";
import { db, queryFirst } from "~/shared/infra/sql";

export async function resolveStore(userId: string, input: string) {
	const { name, normalizedName } = normalizeStoreName(input);
	if (!name) return null;

	const existing = await queryFirst(
		db.sql.public.Store.select("id", "name", "userId")
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.userId, userId),
					functions.eq(fields.normalizedName, normalizedName),
				),
			)
			.limit(1)
			.build(),
	);
	if (existing) return existing;

	return queryFirst(
		db.sql.public.Store.insert([{ name, normalizedName, userId }]).returning("id", "name", "userId").build(),
	);
}
