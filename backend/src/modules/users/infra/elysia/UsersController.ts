import Elysia, { t } from "elysia";
import * as jose from "jose";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

// JWT secret from environment
const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || "zaimu-secret-key-change-in-production",
);
const JWT_EXPIRATION = "7d";

// Helper functions for JWT
async function signJwt(payload: { sub: string; email: string }): Promise<string> {
	return new jose.SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(JWT_EXPIRATION)
		.sign(JWT_SECRET);
}

async function verifyJwt(token: string): Promise<{ sub: string; email: string } | null> {
	try {
		const { payload } = await jose.jwtVerify(token, JWT_SECRET);
		return payload as { sub: string; email: string };
	} catch {
		return null;
	}
}

// Extract bearer token from Authorization header
function getBearerToken(headers: Record<string, string | undefined>): string | null {
	const auth = headers.authorization;
	if (!auth?.startsWith("Bearer ")) return null;
	return auth.slice(7);
}

export const UsersController = new Elysia({ prefix: "/users" })
	.post(
		"/register",
		async ({ body }) => {
			const existing = await db
				.selectFrom("User")
				.where("email", "=", body.email)
				.selectAll()
				.executeTakeFirst();

			if (existing) {
				throw new HttpException("Email already registered", 409);
			}

			// Hash password using Bun's built-in bcrypt
			const hashedPassword = await Bun.password.hash(body.password, {
				algorithm: "bcrypt",
				cost: 12,
			});

			const user = await db
				.insertInto("User")
				.values({
					email: body.email,
					name: body.name,
					password: hashedPassword,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Generate JWT token
			const token = await signJwt({
				email: user.email,
				sub: user.id,
			});

			return {
				token,
				user: {
					createdAt: user.createdAt,
					email: user.email,
					id: user.id,
					name: user.name,
				},
			};
		},
		{
			body: t.Object({
				email: t.String({ format: "email" }),
				name: t.Optional(t.String()),
				password: t.String({ minLength: 8 }),
			}),
			detail: { tags: ["Users"] },
		},
	)
	.post(
		"/login",
		async ({ body }) => {
			const user = await db.selectFrom("User").where("email", "=", body.email).selectAll().executeTakeFirst();

			if (!user) {
				throw new HttpException("Invalid credentials", 401);
			}

			const validPassword = await Bun.password.verify(body.password, user.password);
			if (!validPassword) {
				throw new HttpException("Invalid credentials", 401);
			}

			// Generate JWT token
			const token = await signJwt({
				email: user.email,
				sub: user.id,
			});

			return {
				token,
				user: {
					createdAt: user.createdAt,
					email: user.email,
					id: user.id,
					name: user.name,
				},
			};
		},
		{
			body: t.Object({
				email: t.String({ format: "email" }),
				password: t.String(),
			}),
			detail: { tags: ["Users"] },
		},
	)
	.post(
		"/refresh",
		async ({ headers }) => {
			const token = getBearerToken(headers);
			if (!token) {
				throw new HttpException("No token provided", 401);
			}

			const payload = await verifyJwt(token);
			if (!payload) {
				throw new HttpException("Invalid or expired token", 401);
			}

			// Verify user still exists
			const user = await db
				.selectFrom("User")
				.where("id", "=", payload.sub)
				.select(["id", "email", "name", "createdAt"])
				.executeTakeFirst();

			if (!user) {
				throw new HttpException("User not found", 404);
			}

			// Generate new token
			const newToken = await signJwt({
				email: user.email,
				sub: user.id,
			});

			return { token: newToken, user };
		},
		{
			detail: { tags: ["Users"] },
		},
	)
	.get(
		"/me",
		async ({ headers }) => {
			const token = getBearerToken(headers);
			if (!token) {
				throw new HttpException("Unauthorized", 401);
			}

			const payload = await verifyJwt(token);
			if (!payload) {
				throw new HttpException("Unauthorized", 401);
			}

			const user = await db
				.selectFrom("User")
				.where("id", "=", payload.sub)
				.select(["id", "email", "name", "createdAt"])
				.executeTakeFirst();

			if (!user) {
				throw new HttpException("User not found", 404);
			}

			return user;
		},
		{
			detail: { tags: ["Users"] },
		},
	)
	.patch(
		"/me",
		async ({ headers, body }) => {
			const token = getBearerToken(headers);
			if (!token) {
				throw new HttpException("Unauthorized", 401);
			}

			const payload = await verifyJwt(token);
			if (!payload) {
				throw new HttpException("Unauthorized", 401);
			}

			const userId = payload.sub;
			const updateData: Record<string, unknown> = {};

			if (body.name !== undefined) {
				updateData.name = body.name;
			}

			if (body.currentPassword && body.newPassword) {
				// Verify current password
				const user = await db
					.selectFrom("User")
					.where("id", "=", userId)
					.select(["password"])
					.executeTakeFirst();

				if (!user) {
					throw new HttpException("User not found", 404);
				}

				const validPassword = await Bun.password.verify(body.currentPassword, user.password);
				if (!validPassword) {
					throw new HttpException("Current password is incorrect", 400);
				}

				updateData.password = await Bun.password.hash(body.newPassword, {
					algorithm: "bcrypt",
					cost: 12,
				});
			}

			if (Object.keys(updateData).length === 0) {
				throw new HttpException("No updates provided", 400);
			}

			const updated = await db
				.updateTable("User")
				.set(updateData)
				.where("id", "=", userId)
				.returning(["id", "email", "name", "createdAt"])
				.executeTakeFirstOrThrow();

			return updated;
		},
		{
			body: t.Object({
				currentPassword: t.Optional(t.String()),
				name: t.Optional(t.String()),
				newPassword: t.Optional(t.String({ minLength: 8 })),
			}),
			detail: { tags: ["Users"] },
		},
	)
	.delete(
		"/me",
		async ({ headers, body }) => {
			const token = getBearerToken(headers);
			if (!token) {
				throw new HttpException("Unauthorized", 401);
			}

			const payload = await verifyJwt(token);
			if (!payload) {
				throw new HttpException("Unauthorized", 401);
			}

			const userId = payload.sub;

			// Verify password before deleting account
			const user = await db
				.selectFrom("User")
				.where("id", "=", userId)
				.select(["password"])
				.executeTakeFirst();

			if (!user) {
				throw new HttpException("User not found", 404);
			}

			const validPassword = await Bun.password.verify(body.password, user.password);
			if (!validPassword) {
				throw new HttpException("Password is incorrect", 400);
			}

			// Delete user (cascades to all related data)
			await db.deleteFrom("User").where("id", "=", userId).execute();

			return { success: true };
		},
		{
			body: t.Object({
				password: t.String(),
			}),
			detail: { tags: ["Users"] },
		},
	)
	// Data sync endpoint - receives all local data and merges with server
	.post(
		"/sync",
		async ({ headers, body }) => {
			const token = getBearerToken(headers);
			if (!token) {
				throw new HttpException("Unauthorized", 401);
			}

			const payload = await verifyJwt(token);
			if (!payload) {
				throw new HttpException("Unauthorized", 401);
			}

			const userId = payload.sub;

			const results = {
				accounts: { errors: [] as string[], synced: 0 },
				categories: { errors: [] as string[], synced: 0 },
				debts: { errors: [] as string[], synced: 0 },
				loans: { errors: [] as string[], synced: 0 },
				salaries: { errors: [] as string[], synced: 0 },
				subscriptions: { errors: [] as string[], synced: 0 },
				transactions: { errors: [] as string[], synced: 0 },
			};

			// Sync accounts
			if (body.accounts?.length) {
				for (const account of body.accounts) {
					try {
						await db
							.insertInto("Account")
							.values({
								...account,
								id: account.id || crypto.randomUUID(),
								userId,
							})
							.onConflict(oc =>
								oc.column("id").doUpdateSet({
									balance: account.balance,
									name: account.name,
									type: account.type,
									updatedAt: new Date(),
								}),
							)
							.execute();
						results.accounts.synced++;
					} catch (e) {
						results.accounts.errors.push(`Failed to sync account: ${account.name}`);
					}
				}
			}

			// Sync categories
			if (body.categories?.length) {
				for (const category of body.categories) {
					try {
						await db
							.insertInto("Category")
							.values({
								...category,
								id: category.id || crypto.randomUUID(),
								userId,
							})
							.onConflict(oc =>
								oc.column("id").doUpdateSet({
									color: category.color,
									icon: category.icon,
									name: category.name,
								}),
							)
							.execute();
						results.categories.synced++;
					} catch (e) {
						results.categories.errors.push(`Failed to sync category: ${category.name}`);
					}
				}
			}

			// Sync transactions
			if (body.transactions?.length) {
				for (const tx of body.transactions) {
					try {
						await db
							.insertInto("Transaction")
							.values({
								...tx,
								id: tx.id || crypto.randomUUID(),
							})
							.onConflict(oc =>
								oc.column("id").doUpdateSet({
									amount: tx.amount,
									date: tx.date,
									description: tx.description,
									type: tx.type,
								}),
							)
							.execute();
						results.transactions.synced++;
					} catch (e) {
						results.transactions.errors.push(`Failed to sync transaction: ${tx.description || tx.id}`);
					}
				}
			}

			// Get all server data to return
			const serverData = {
				accounts: await db.selectFrom("Account").where("userId", "=", userId).selectAll().execute(),
				categories: await db.selectFrom("Category").where("userId", "=", userId).selectAll().execute(),
				debts: await db.selectFrom("Debt").where("userId", "=", userId).selectAll().execute(),
				loans: await db.selectFrom("Loan").where("userId", "=", userId).selectAll().execute(),
				salaries: await db.selectFrom("Salary").where("userId", "=", userId).selectAll().execute(),
				subscriptions: await db.selectFrom("Subscription").where("userId", "=", userId).selectAll().execute(),
				transactions: await db
					.selectFrom("Transaction as t")
					.leftJoin("Account as origin", "t.originId", "origin.id")
					.leftJoin("Account as dest", "t.destinationId", "dest.id")
					.where(eb => eb.or([eb("origin.userId", "=", userId), eb("dest.userId", "=", userId)]))
					.selectAll("t")
					.execute(),
			};

			return {
				serverData,
				syncResults: results,
			};
		},
		{
			body: t.Object({
				accounts: t.Optional(t.Array(t.Any())),
				categories: t.Optional(t.Array(t.Any())),
				debts: t.Optional(t.Array(t.Any())),
				loans: t.Optional(t.Array(t.Any())),
				salaries: t.Optional(t.Array(t.Any())),
				subscriptions: t.Optional(t.Array(t.Any())),
				transactions: t.Optional(t.Array(t.Any())),
			}),
			detail: { tags: ["Users"] },
		},
	);
