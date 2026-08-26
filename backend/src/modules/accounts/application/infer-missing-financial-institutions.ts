import { db, executeStatement, queryRows } from "~/shared/infra/sql";
import { resolveFinancialInstitution } from "./resolve-financial-institution";

/**
 * Accounts created before institutions existed used the account name as the
 * institution label. Preserve that information by assigning those accounts on
 * their first read. Cash stays intentionally ungrouped.
 */
export async function inferMissingFinancialInstitutions(userId: string) {
	const accounts = await queryRows(
		db.sql.public.FinancialAccount.select("id", "name")
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.userId, userId),
					functions.ne(fields.type, "CASH"),
					functions.raw`${fields.institutionId} IS NULL`.returns("pg/bool@1"),
				),
			)
			.build(),
	);

	for (const account of accounts) {
		const institution = await resolveFinancialInstitution(userId, account.name);
		if (!institution) continue;
		await executeStatement(
			db.sql.public.FinancialAccount.update({ institutionId: institution.id, updatedAt: new Date() })
				.where((fields, functions) => functions.eq(fields.id, account.id))
				.build(),
		);
	}
}
