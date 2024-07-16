import { type HashProviderKeys, hashProviders } from "@hyoretsu/providers";
import { AuthenticateUser, CreateUser, EditUser } from "@zaimu/application";
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
				authenticateUser: new AuthenticateUser(hashProvider, usersRepository),
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
			})
			.post(
				"/login",
				async ({ authenticateUser, body, cookie: { auth } }) => {
					const jwt = await authenticateUser.execute(body);

					auth.set({
						value: jwt,
						httpOnly: true,
						secure: true,
						maxAge: 7 * 86400,
					});
				},
				{
					detail: {
						tags: ["Users"],
					},
					body: t.Object({
						email: t.String({ format: "email" }),
						password: t.String(),
					}),
					response: t.Void(),
				},
			);
	});
