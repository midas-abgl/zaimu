import Elysia, { t } from "elysia";
import { requireUserId } from "~/modules/auth";
import { resolveStore } from "~/modules/stores/application/resolve-store";
import { normalizeStoreName } from "~/modules/stores/domain/normalize-store-name";
import { HttpException } from "~/shared/errors";
import { db, queryRows } from "~/shared/infra/sql";

export const StoresController = new Elysia({ prefix: "/stores" })
	.get(
		"/",
		async ({ request }) => {
			const userId = await requireUserId(request);
			return queryRows(
				db.sql.public.Store.select("id", "name", "userId")
					.where((fields, functions) => functions.eq(fields.userId, userId))
					.orderBy("name", { direction: "asc" })
					.build(),
			);
		},
		{ detail: { tags: ["Stores"] } },
	)
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			if (!normalizeStoreName(body.name).name) throw new HttpException("Informe o nome da loja", 400);
			const store = await resolveStore(userId, body.name);
			if (!store) throw new HttpException("Loja não criada", 500);
			return store;
		},
		{
			body: t.Object({ name: t.String({ maxLength: 200 }) }),
			detail: { tags: ["Stores"] },
		},
	);
