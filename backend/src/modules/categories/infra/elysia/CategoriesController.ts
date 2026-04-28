import Elysia, { t } from "elysia";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

export const CategoriesController = new Elysia({ prefix: "/categories" })
	.get(
		"/",
		async ({ query }) => {
			let queryBuilder = db.selectFrom("Category").selectAll();

			if (query.userId) {
				queryBuilder = queryBuilder.where("userId", "=", query.userId);
			}

			const categories = await queryBuilder.orderBy("name", "asc").execute();
			return categories;
		},
		{
			detail: { tags: ["Categories"] },
			query: t.Object({
				userId: t.Optional(t.String({ format: "uuid" })),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const category = await db
				.selectFrom("Category")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!category) {
				throw new HttpException("Category not found", 404);
			}

			return category;
		},
		{
			detail: { tags: ["Categories"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.post(
		"/",
		async ({ body }) => {
			const existing = await db
				.selectFrom("Category")
				.where("userId", "=", body.userId)
				.where("name", "=", body.name)
				.selectAll()
				.executeTakeFirst();

			if (existing) {
				throw new HttpException("Category with this name already exists", 409);
			}

			const category = await db
				.insertInto("Category")
				.values({
					color: body.color,
					icon: body.icon,
					name: body.name,
					parentId: body.parentId,
					userId: body.userId,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			return category;
		},
		{
			body: t.Object({
				color: t.Optional(t.String({ maxLength: 7 })),
				icon: t.Optional(t.String({ maxLength: 50 })),
				name: t.String({ maxLength: 50 }),
				parentId: t.Optional(t.String({ format: "uuid" })),
				userId: t.String({ format: "uuid" }),
			}),
			detail: { tags: ["Categories"] },
		},
	)
	.patch(
		"/:id",
		async ({ params, body }) => {
			const existing = await db
				.selectFrom("Category")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Category not found", 404);
			}

			const category = await db
				.updateTable("Category")
				.set({
					...(body.name && { name: body.name }),
					...(body.color !== undefined && { color: body.color }),
					...(body.icon !== undefined && { icon: body.icon }),
					...(body.parentId !== undefined && { parentId: body.parentId }),
					updatedAt: new Date(),
				})
				.where("id", "=", params.id)
				.returningAll()
				.executeTakeFirstOrThrow();

			return category;
		},
		{
			body: t.Object({
				color: t.Optional(t.Nullable(t.String({ maxLength: 7 }))),
				icon: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
				name: t.Optional(t.String({ maxLength: 50 })),
				parentId: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
			}),
			detail: { tags: ["Categories"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			const existing = await db
				.selectFrom("Category")
				.where("id", "=", params.id)
				.selectAll()
				.executeTakeFirst();

			if (!existing) {
				throw new HttpException("Category not found", 404);
			}

			await db.deleteFrom("Category").where("id", "=", params.id).execute();
			return { success: true };
		},
		{
			detail: { tags: ["Categories"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	);
