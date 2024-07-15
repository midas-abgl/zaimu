import { type HashProviderKeys, hashProviders } from "@hyoretsu/providers";
import { CreateUser, EditUser } from "@zaimu/application";
import { Elysia, t } from "elysia";
import { KyselyUsersRepository, database } from "~/sql/kysely";

export const UsersController = new Elysia()
	.decorate({
		hashProvider: new hashProviders[process.env.HASH_DRIVER as HashProviderKeys](),
		usersRepository: new KyselyUsersRepository(database),
	})
	.group("/users", app => {
		const { hashProvider, usersRepository } = app.decorator;

		return app
			.decorate({
				createUser: new CreateUser(hashProvider, usersRepository),
				editUser: new EditUser(hashProvider, usersRepository),
			})
			.post("/", ({ body, createUser }) => createUser.execute(body), {
				detail: {
					tags: ["Users"],
				},
				body: t.Object({
					email: t.String({ format: "email" }),
					password: t.String(),
				}),
				response: t.Object({
					email: t.String(),
					password: t.String(),
					createdAt: t.Date(),
					updatedAt: t.Date(),
				}),
			})
			.patch("/", ({ body, editUser }) => editUser.execute(body), {
				detail: {
					tags: ["Users"],
				},
				body: t.Object({
					email: t.String({ format: "email" }),
					password: t.String(),
				}),
				response: t.Object({
					email: t.String(),
					password: t.String(),
					createdAt: t.Date(),
					updatedAt: t.Date(),
				}),
			});
	});
