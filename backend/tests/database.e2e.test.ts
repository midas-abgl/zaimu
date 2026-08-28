import { afterAll, beforeAll, describe, expect, test } from "bun:test";

const databaseTestUrl = process.env.DATABASE_TEST_URL;
const suite = databaseTestUrl ? describe : describe.skip;

interface Server {
	handle(request: Request): Response | Promise<Response>;
}

let server: Server;
let db: typeof import("sql")["db"];
let closeDatabase: () => Promise<void>;
const userIds: string[] = [];

const jsonRequest = (path: string, method: string, body?: unknown, cookie?: string) =>
	server.handle(
		new Request(`http://localhost${path}`, {
			body: body === undefined ? undefined : JSON.stringify(body),
			headers: {
				...(cookie ? { cookie } : {}),
				"content-type": "application/json",
				origin: "http://localhost:5173",
			},
			method,
		}),
	);

const createSession = async (label: string) => {
	const email = `prisma8-${label}-${crypto.randomUUID()}@example.com`;
	const password = "Prisma8-test-password";
	const signup = await jsonRequest("/api/auth/sign-up/email", "POST", {
		email,
		name: `Prisma 8 ${label}`,
		password,
	});
	if (signup.status !== 200) throw new Error(`Signup failed with ${signup.status}`);

	const user = await db.orm.public.User.where(fields => fields.email.eq(email)).update({
		emailVerified: true,
	});
	const userId = user?.id;
	if (!userId) throw new Error("Signup user was not persisted");
	userIds.push(userId!);

	const signin = await jsonRequest("/api/auth/sign-in/email", "POST", { email, password });
	if (signin.status !== 200) throw new Error(`Signin failed with ${signin.status}`);
	const cookie = signin.headers.get("set-cookie")?.split(";")[0];
	if (!cookie) throw new Error("Signin did not return a session cookie");
	return { cookie: cookie!, userId: userId! };
};

suite("Prisma 8 SQL query builder", () => {
	beforeAll(async () => {
		process.env.DATABASE_URL = databaseTestUrl!;
		process.env.NODE_ENV = "test";
		process.env.BETTER_AUTH_SECRET ??= "zaimu-e2e-secret-with-at-least-32-characters";
		({ server } = await import("../src/server"));
		({ closeDatabase, db } = await import("sql"));
	});

	afterAll(async () => {
		if (userIds.length > 0) await db.orm.public.User.where(fields => fields.id.in(userIds)).deleteAndCount();
		await closeDatabase();
	});

	test("auth, ownership, CRUD, arithmetic, aggregates, and empty sync", async () => {
		const owner = await createSession("owner");
		const outsider = await createSession("outsider");
		const accountName = `Conta ${crypto.randomUUID()}`;

		const accountResponse = await jsonRequest(
			"/financial-accounts/",
			"POST",
			{ balance: 100.25, institutionName: "Mercado Pago", name: accountName, type: "CHECKING" },
			owner.cookie,
		);
		expect(accountResponse.status).toBe(200);
		const account = (await accountResponse.json()) as {
			balance: number;
			id: string;
			institution: { id: string; name: string };
		};
		expect(account.balance).toBe(100.25);
		expect(typeof account.balance).toBe("number");
		expect(account.institution.name).toBe("Mercado Pago");

		const unnamedAccountResponse = await jsonRequest(
			"/financial-accounts/",
			"POST",
			{ institutionName: "Mercado Pago", type: "SAVINGS" },
			owner.cookie,
		);
		expect(unnamedAccountResponse.status).toBe(200);
		const unnamedAccount = (await unnamedAccountResponse.json()) as { id: string; name: string | null };
		expect(unnamedAccount.name).toBeNull();

		const creditCardResponse = await jsonRequest(
			"/financial-accounts/",
			"POST",
			{
				balance: 999,
				creditCard: {
					creditLimit: 1500,
					dueDay: 17,
					securityDeposit: 500,
					statementDay: 10,
				},
				institutionName: " mercado   PAGO ",
				name: accountName,
				type: "CREDIT_CARD",
			},
			owner.cookie,
		);
		expect(creditCardResponse.status).toBe(200);
		const creditCardAccount = (await creditCardResponse.json()) as {
			balance: number | null;
			creditCard: { securityDeposit: number | null };
			id: string;
			institution: { id: string };
		};
		expect(creditCardAccount.balance).toBeNull();
		expect(creditCardAccount.creditCard.securityDeposit).toBe(500);
		expect(creditCardAccount.institution.id).toBe(account.institution.id);

		const accountsResponse = await jsonRequest("/financial-accounts/", "GET", undefined, owner.cookie);
		expect(accountsResponse.status).toBe(200);
		const accounts = (await accountsResponse.json()) as Array<{
			id: string;
			creditCard?: {
				creditLimit: number;
				dueDay: number;
				securityDeposit: number | null;
				statementDay: number;
				workingDueDate: boolean;
			} | null;
		}>;
		expect(accounts.find(item => item.id === creditCardAccount.id)?.creditCard).toMatchObject({
			creditLimit: 1500,
			dueDay: 17,
			securityDeposit: 500,
			statementDay: 10,
			workingDueDate: false,
		});

		const duplicateAccount = await jsonRequest(
			"/financial-accounts/",
			"POST",
			{ institutionName: "Mercado Pago", name: accountName, type: "CHECKING" },
			owner.cookie,
		);
		expect(duplicateAccount.status).toBe(409);
		expect(await duplicateAccount.json()).toEqual({
			error: "Já existe uma conta desse tipo com este nome",
		});

		const clearNameResponse = await jsonRequest(
			`/financial-accounts/${account.id}`,
			"PATCH",
			{ name: null },
			owner.cookie,
		);
		expect(clearNameResponse.status).toBe(200);
		expect(((await clearNameResponse.json()) as { name: string | null }).name).toBeNull();

		const creditCardTransaction = await jsonRequest(
			"/transactions/",
			"POST",
			{
				amount: 10,
				date: "2026-08-23",
				originFinancialAccountId: creditCardAccount.id,
				type: "EXPENSE",
			},
			owner.cookie,
		);
		expect(creditCardTransaction.status).toBe(400);
		expect(await creditCardTransaction.json()).toEqual({
			error: "Cartão de crédito não possui saldo próprio",
		});

		const forbidden = await jsonRequest(
			`/financial-accounts/${account.id}`,
			"GET",
			undefined,
			outsider.cookie,
		);
		expect(forbidden.status).toBe(404);

		const categoryResponse = await jsonRequest(
			"/categories/",
			"POST",
			{ color: "#123456", name: `Categoria ${crypto.randomUUID()}` },
			owner.cookie,
		);
		expect(categoryResponse.status).toBe(200);
		const category = (await categoryResponse.json()) as { id: string };

		const incomeResponse = await jsonRequest(
			"/transactions/",
			"POST",
			{
				amount: 19.75,
				categoryId: category.id,
				date: "2026-08-23",
				destinationFinancialAccountId: account.id,
				type: "INCOME",
			},
			owner.cookie,
		);
		expect(incomeResponse.status).toBe(200);
		const income = (await incomeResponse.json()) as { amount: number; id: string };
		expect(income.amount).toBe(19.75);

		const updatedAccount = await jsonRequest(
			`/financial-accounts/${account.id}`,
			"GET",
			undefined,
			owner.cookie,
		);
		expect(((await updatedAccount.json()) as { balance: number }).balance).toBe(120);

		const destinationResponse = await jsonRequest(
			"/financial-accounts/",
			"POST",
			{ balance: 50, name: `Destino ${crypto.randomUUID()}`, type: "SAVINGS" },
			owner.cookie,
		);
		const destination = (await destinationResponse.json()) as { id: string };
		expect(destinationResponse.status).toBe(200);

		const expenseResponse = await jsonRequest(
			"/transactions/",
			"POST",
			{
				amount: 10,
				date: "2026-08-23",
				originFinancialAccountId: account.id,
				type: "EXPENSE",
			},
			owner.cookie,
		);
		const expense = (await expenseResponse.json()) as { id: string };
		expect(expenseResponse.status).toBe(200);

		const transferResponse = await jsonRequest(
			"/transactions/",
			"POST",
			{
				amount: 20,
				date: "2026-08-23",
				destinationFinancialAccountId: destination.id,
				originFinancialAccountId: account.id,
				type: "TRANSFER",
			},
			owner.cookie,
		);
		const transfer = (await transferResponse.json()) as { id: string };
		expect(transferResponse.status).toBe(200);

		const transferredOrigin = await jsonRequest(
			`/financial-accounts/${account.id}`,
			"GET",
			undefined,
			owner.cookie,
		);
		const transferredDestination = await jsonRequest(
			`/financial-accounts/${destination.id}`,
			"GET",
			undefined,
			owner.cookie,
		);
		expect(((await transferredOrigin.json()) as { balance: number }).balance).toBe(90);
		expect(((await transferredDestination.json()) as { balance: number }).balance).toBe(70);

		expect(
			(await jsonRequest(`/transactions/${transfer.id}`, "DELETE", undefined, owner.cookie)).status,
		).toBe(200);
		expect((await jsonRequest(`/transactions/${expense.id}`, "DELETE", undefined, owner.cookie)).status).toBe(
			200,
		);

		const cardAccountResponse = await jsonRequest(
			"/financial-accounts/",
			"POST",
			{
				balance: 0,
				creditCard: { creditLimit: 1500, dueDay: 10, statementDay: 3 },
				name: `Cartão ${crypto.randomUUID()}`,
				type: "CREDIT_CARD",
			},
			owner.cookie,
		);
		const cardAccount = (await cardAccountResponse.json()) as { creditCard: { id: string } };
		expect(cardAccountResponse.status).toBe(200);

		const purchaseResponse = await jsonRequest(
			`/credit-cards/${cardAccount.creditCard.id}/purchases`,
			"POST",
			{ description: "Compra sem categoria", installments: 2, purchaseDate: "2026-08-02", totalAmount: 99.9 },
			owner.cookie,
		);
		const purchases = (await purchaseResponse.json()) as Array<{
			categoryId: null;
			installmentAmount: number;
			totalAmount: number;
		}>;
		expect(purchaseResponse.status).toBe(200);
		expect(purchases).toHaveLength(2);
		expect(purchases[0]?.categoryId).toBeNull();
		expect(purchases[0]?.installmentAmount).toBe(49.95);
		expect(typeof purchases[0]?.totalAmount).toBe("number");

		const statementsResponse = await jsonRequest(
			`/credit-cards/${cardAccount.creditCard.id}/statements`,
			"GET",
			undefined,
			owner.cookie,
		);
		const statement = (await statementsResponse.json()) as Array<{ id: string; totalAmount: number }>;
		expect(statementsResponse.status).toBe(200);
		const statementToPay = statement[0]!;
		const statementPaymentResponse = await jsonRequest(
			`/credit-cards/${cardAccount.creditCard.id}/statements/${statementToPay.id}/pay`,
			"POST",
			{
				amount: 20,
				date: "2026-08-23",
				financialAccountId: account.id,
			},
			owner.cookie,
		);
		expect(statementPaymentResponse.status).toBe(200);
		const statementPayment = (await statementPaymentResponse.json()) as {
			statement: { paidAmount: number };
			transaction: { amount: number; description: string; type: string };
		};
		expect(statementPayment.statement.paidAmount).toBe(20);
		expect(statementPayment.transaction).toMatchObject({
			amount: 20,
			description: expect.stringContaining("Pagamento da fatura"),
			type: "EXPENSE",
		});

		const lifecycleCases = [
			{
				create: {
					amount: 30,
					date: "2026-08-01",
					description: "Temporária",
					personName: "Pessoa",
				},
				numericField: "amount",
				path: "/debts",
				update: { amount: 35, description: null, dueDate: null, isPaid: true },
			},
			{
				create: {
					amount: 45,
					dayOfMonth: 5,
					frequency: "MONTHLY",
					name: "Recorrência",
					startDate: "2026-08-01",
				},
				numericField: "amount",
				path: "/recurring",
				update: { amount: 48, categoryId: null, dayOfMonth: null, endDate: null },
			},
			{
				create: {
					amount: 4200,
					financialAccountId: account.id,
					payDay: 5,
					source: "Empresa",
					startDate: "2026-08-01",
				},
				numericField: "amount",
				path: "/salaries",
				update: { amount: 5100, endDate: null, isActive: false },
			},
			{
				create: {
					amount: 29.9,
					billingDay: 12,
					name: "Serviço",
					startDate: "2026-08-01",
				},
				numericField: "amount",
				path: "/subscriptions",
				update: { amount: 32.5, endDate: null, isActive: false },
			},
		] as const;

		for (const lifecycle of lifecycleCases) {
			const createdResponse = await jsonRequest(`${lifecycle.path}/`, "POST", lifecycle.create, owner.cookie);
			const created = (await createdResponse.json()) as Record<string, unknown> & { id: string };
			expect(createdResponse.status).toBe(200);
			expect(typeof created[lifecycle.numericField]).toBe("number");

			const updateResponse = await jsonRequest(
				`${lifecycle.path}/${created.id}`,
				"PATCH",
				lifecycle.update,
				owner.cookie,
			);
			expect(updateResponse.status).toBe(200);
			const updated = (await updateResponse.json()) as { endDate?: null };
			if ("endDate" in lifecycle.update) expect(updated.endDate).toBeNull();

			const historyResponse = await jsonRequest(
				`${lifecycle.path}/${created.id}/history`,
				"GET",
				undefined,
				owner.cookie,
			);
			expect(historyResponse.status).toBe(200);
			expect(((await historyResponse.json()) as unknown[]).length).toBeGreaterThan(0);
		}

		const dashboard = await jsonRequest("/dashboard/", "GET", undefined, owner.cookie);
		expect(dashboard.status).toBe(200);
		expect(JSON.stringify(await dashboard.json())).toContain("19.75");

		const deletion = await jsonRequest(`/transactions/${income.id}`, "DELETE", undefined, owner.cookie);
		expect(deletion.status).toBe(200);
		const reversed = await jsonRequest(`/financial-accounts/${account.id}`, "GET", undefined, owner.cookie);
		expect(((await reversed.json()) as { balance: number }).balance).toBe(100.25);

		const outsiderAccountResponse = await jsonRequest(
			"/financial-accounts/",
			"POST",
			{ balance: 1, name: `Externa ${crypto.randomUUID()}`, type: "CHECKING" },
			outsider.cookie,
		);
		const outsiderAccount = (await outsiderAccountResponse.json()) as { id: string };
		const conflictSync = await jsonRequest(
			"/sync/",
			"POST",
			{
				financialAccounts: [
					{ balance: 999, id: outsiderAccount.id, name: "Tentativa indevida", type: "CHECKING" },
				],
			},
			owner.cookie,
		);
		const conflictResult = (await conflictSync.json()) as {
			syncResults: { financialAccounts: { errors: string[]; synced: number } };
		};
		expect(conflictSync.status).toBe(200);
		expect(conflictResult.syncResults.financialAccounts.synced).toBe(0);
		expect(conflictResult.syncResults.financialAccounts.errors).toHaveLength(1);

		const bulkSync = await jsonRequest(
			"/sync/",
			"POST",
			{
				financialAccounts: [
					{ balance: 3.5, id: crypto.randomUUID(), name: `Offline A ${crypto.randomUUID()}`, type: "CASH" },
					{
						balance: 7.25,
						id: crypto.randomUUID(),
						name: `Offline B ${crypto.randomUUID()}`,
						type: "SAVINGS",
					},
				],
			},
			owner.cookie,
		);
		const bulkResult = (await bulkSync.json()) as {
			syncResults: { financialAccounts: { errors: string[]; synced: number } };
		};
		expect(bulkSync.status).toBe(200);
		expect(bulkResult.syncResults.financialAccounts.synced).toBe(2);
		expect(bulkResult.syncResults.financialAccounts.errors).toHaveLength(0);

		const sync = await jsonRequest("/sync/", "POST", {}, owner.cookie);
		expect(sync.status).toBe(200);
		const syncBody = (await sync.json()) as { syncResults: Record<string, { synced: number }> };
		expect(Object.values(syncBody.syncResults).every(result => result.synced === 0)).toBe(true);
	});
});
