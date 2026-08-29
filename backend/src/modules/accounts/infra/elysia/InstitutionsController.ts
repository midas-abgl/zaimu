import Elysia, { t } from "elysia";
import { normalizeFinancialInstitutionName } from "~/modules/accounts/domain/normalize-financial-institution-name";
import { requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, queryFirst } from "~/shared/infra/sql";

const Id = t.String({ maxLength: 36, minLength: 1 });

export const InstitutionsController = new Elysia({ prefix: "/financial-institutions" })
	.patch(
		"/:id",
		async ({ body, params, request }) => {
			const userId = await requireUserId(request);
			const { name, normalizedName } = normalizeFinancialInstitutionName(body.name);
			if (!name) throw new HttpException("Informe o nome da instituição", 400);
			const existing = await queryFirst(
				db.sql.public.FinancialInstitution.select("id")
					.where((fields, functions) =>
						functions.and(functions.eq(fields.id, params.id), functions.eq(fields.userId, userId)),
					)
					.limit(1)
					.build(),
			);
			if (!existing) throw new HttpException("Instituição financeira não encontrada", 404);
			const matching = await queryFirst(
				db.sql.public.FinancialInstitution.select("id", "name")
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.userId, userId),
							functions.eq(fields.normalizedName, normalizedName),
						),
					)
					.limit(1)
					.build(),
			);
			if (matching && matching.id !== params.id) {
				await executeStatement(
					db.sql.public.FinancialAccount.update({ institutionId: matching.id, updatedAt: new Date() })
						.where((fields, functions) => functions.eq(fields.institutionId, params.id))
						.build(),
				);
				await executeStatement(
					db.sql.public.FinancialInstitution.delete()
						.where((fields, functions) => functions.eq(fields.id, params.id))
						.build(),
				);
				return matching;
			}
			const institution = await queryFirst(
				db.sql.public.FinancialInstitution.update({ name, normalizedName, updatedAt: new Date() })
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.returning("id", "name")
					.build(),
			);
			if (!institution) throw new HttpException("Instituição financeira não encontrada", 404);
			return institution;
		},
		{
			body: t.Object({ name: t.String({ maxLength: 100, minLength: 1 }) }),
			detail: { tags: ["Institutions"] },
			params: t.Object({ id: Id }),
		},
	)
	.delete(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			const existing = await queryFirst(
				db.sql.public.FinancialInstitution.select("id")
					.where((fields, functions) =>
						functions.and(functions.eq(fields.id, params.id), functions.eq(fields.userId, userId)),
					)
					.limit(1)
					.build(),
			);
			if (!existing) throw new HttpException("Instituição financeira não encontrada", 404);

			await executeStatement(
				db.sql.public.FinancialAccount.update({ institutionId: null, updatedAt: new Date() })
					.where((fields, functions) => functions.eq(fields.institutionId, params.id))
					.build(),
			);
			await executeStatement(
				db.sql.public.FinancialInstitution.delete()
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.build(),
			);
			return { success: true };
		},
		{
			detail: { tags: ["Institutions"] },
			params: t.Object({ id: Id }),
		},
	);
