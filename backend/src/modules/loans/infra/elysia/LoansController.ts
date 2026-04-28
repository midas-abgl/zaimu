import { addMonths, differenceInMonths } from "date-fns";
import Elysia, { t } from "elysia";
import { HttpException } from "~/shared/errors";
import { db } from "~/shared/infra/sql";

const AmortizationType = t.Union([t.Literal("PRICE"), t.Literal("SAC"), t.Literal("SACRE")]);
const AdvanceType = t.Union([t.Literal("FRONT"), t.Literal("BACK")]);

/**
 * Calculate loan amortization schedule
 */
function calculateLoanSchedule(
	principal: number,
	monthlyRate: number,
	totalInstallments: number,
	amortization: "PRICE" | "SAC" | "SACRE",
	startDate: Date,
	firstDueDate: Date,
) {
	const schedule: Array<{
		installmentNumber: number;
		dueDate: Date;
		principal: number;
		interest: number;
		total: number;
		remainingBalance: number;
	}> = [];

	let remainingBalance = principal;

	if (amortization === "PRICE") {
		// Price system (constant installments)
		const installmentAmount =
			(principal * monthlyRate * (1 + monthlyRate) ** totalInstallments) /
			((1 + monthlyRate) ** totalInstallments - 1);

		for (let i = 1; i <= totalInstallments; i++) {
			const interest = remainingBalance * monthlyRate;
			const principalPayment = installmentAmount - interest;
			remainingBalance -= principalPayment;

			schedule.push({
				dueDate: addMonths(firstDueDate, i - 1),
				installmentNumber: i,
				interest,
				principal: principalPayment,
				remainingBalance: Math.max(0, remainingBalance),
				total: installmentAmount,
			});
		}
	} else if (amortization === "SAC") {
		// SAC system (constant amortization)
		const constantPrincipal = principal / totalInstallments;

		for (let i = 1; i <= totalInstallments; i++) {
			const interest = remainingBalance * monthlyRate;
			remainingBalance -= constantPrincipal;

			schedule.push({
				dueDate: addMonths(firstDueDate, i - 1),
				installmentNumber: i,
				interest,
				principal: constantPrincipal,
				remainingBalance: Math.max(0, remainingBalance),
				total: constantPrincipal + interest,
			});
		}
	}

	return schedule;
}

/**
 * Calculate early payoff amount at a given date
 * Considers front advance (pay from start) or back advance (pay from end)
 */
function calculateEarlyPayoff(
	loan: {
		principalAmount: number;
		interestRate: number;
		totalInstallments: number;
		amortization: "PRICE" | "SAC" | "SACRE";
		startDate: Date;
		firstDueDate: Date;
	},
	paidInstallments: number,
	targetDate: Date,
	advanceType: "FRONT" | "BACK",
): {
	totalToPay: number;
	savedInterest: number;
	remainingPrincipal: number;
} {
	const monthlyRate = Number(loan.interestRate);
	const schedule = calculateLoanSchedule(
		Number(loan.principalAmount),
		monthlyRate,
		loan.totalInstallments,
		loan.amortization as "PRICE" | "SAC",
		new Date(loan.startDate),
		new Date(loan.firstDueDate),
	);

	// Calculate remaining principal after paid installments
	const remainingPrincipal =
		paidInstallments > 0 ? schedule[paidInstallments - 1].remainingBalance : Number(loan.principalAmount);

	const remainingInstallments = loan.totalInstallments - paidInstallments;

	if (advanceType === "BACK") {
		// Back advance: Pay remaining principal without future interest
		const totalFutureInterest = schedule
			.slice(paidInstallments)
			.reduce((sum, inst) => sum + inst.interest, 0);

		return {
			remainingPrincipal,
			savedInterest: totalFutureInterest,
			totalToPay: remainingPrincipal,
		};
	}
	// Front advance: Pay principal + accrued interest until target date
	const monthsToTarget = differenceInMonths(targetDate, new Date(loan.firstDueDate)) + 1;
	const accruedInterest = remainingPrincipal * monthlyRate * Math.max(0, monthsToTarget - paidInstallments);

	const totalFutureInterest = schedule
		.slice(Math.max(paidInstallments, monthsToTarget))
		.reduce((sum, inst) => sum + inst.interest, 0);

	return {
		remainingPrincipal,
		savedInterest: totalFutureInterest,
		totalToPay: remainingPrincipal + accruedInterest,
	};
}

export const LoansController = new Elysia({ prefix: "/loans" })
	.get(
		"/",
		async ({ query }) => {
			let queryBuilder = db.selectFrom("Loan").selectAll();

			if (query.userId) {
				queryBuilder = queryBuilder.where("userId", "=", query.userId);
			}

			const loans = await queryBuilder.orderBy("startDate", "desc").execute();

			// Get payment info for each loan
			const loansWithPayments = await Promise.all(
				loans.map(async loan => {
					const payments = await db
						.selectFrom("LoanPayment")
						.where("loanId", "=", loan.id)
						.where("paidDate", "is not", null)
						.selectAll()
						.execute();

					const paidInstallments = payments.length;
					const remainingInstallments = loan.totalInstallments - paidInstallments;
					const totalPaid = payments.reduce((sum, p) => sum + Number(p.totalPaid), 0);

					return {
						...loan,
						paidInstallments,
						remainingInstallments,
						totalPaid,
					};
				}),
			);

			return loansWithPayments;
		},
		{
			detail: { tags: ["Loans"] },
			query: t.Object({
				userId: t.Optional(t.String({ format: "uuid" })),
			}),
		},
	)
	.get(
		"/:id",
		async ({ params }) => {
			const loan = await db.selectFrom("Loan").where("id", "=", params.id).selectAll().executeTakeFirst();

			if (!loan) {
				throw new HttpException("Loan not found", 404);
			}

			const payments = await db
				.selectFrom("LoanPayment")
				.where("loanId", "=", params.id)
				.selectAll()
				.orderBy("installmentNumber", "asc")
				.execute();

			// Generate full schedule
			const schedule = calculateLoanSchedule(
				Number(loan.principalAmount),
				Number(loan.interestRate),
				loan.totalInstallments,
				loan.amortization as "PRICE" | "SAC",
				new Date(loan.startDate),
				new Date(loan.firstDueDate),
			);

			return {
				...loan,
				payments,
				schedule,
			};
		},
		{
			detail: { tags: ["Loans"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.get(
		"/:id/early-payoff",
		async ({ params, query }) => {
			const loan = await db.selectFrom("Loan").where("id", "=", params.id).selectAll().executeTakeFirst();

			if (!loan) {
				throw new HttpException("Loan not found", 404);
			}

			const paidPayments = await db
				.selectFrom("LoanPayment")
				.where("loanId", "=", params.id)
				.where("paidDate", "is not", null)
				.selectAll()
				.execute();

			const targetDate = query.targetDate ? new Date(query.targetDate) : new Date();
			const advanceType = query.advanceType ?? "BACK";

			const payoff = calculateEarlyPayoff(
				{
					amortization: loan.amortization as "PRICE" | "SAC",
					firstDueDate: new Date(loan.firstDueDate),
					interestRate: Number(loan.interestRate),
					principalAmount: Number(loan.principalAmount),
					startDate: new Date(loan.startDate),
					totalInstallments: loan.totalInstallments,
				},
				paidPayments.length,
				targetDate,
				advanceType,
			);

			return {
				advanceType,
				loanId: loan.id,
				paidInstallments: paidPayments.length,
				targetDate,
				...payoff,
			};
		},
		{
			detail: { tags: ["Loans"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
			query: t.Object({
				advanceType: t.Optional(AdvanceType),
				targetDate: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/",
		async ({ body }) => {
			// Calculate installment amount if not provided
			let installmentAmount = body.installmentAmount;

			if (!installmentAmount) {
				const monthlyRate = body.interestRate;
				const principal = body.principalAmount;
				const n = body.totalInstallments;

				if (body.amortization === "PRICE") {
					installmentAmount =
						(principal * monthlyRate * (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** n - 1);
				} else {
					// SAC - first installment
					installmentAmount = principal / n + principal * monthlyRate;
				}
			}

			const loan = await db
				.insertInto("Loan")
				.values({
					amortization: body.amortization ?? "PRICE",
					description: body.description,
					dueDay: body.dueDay,
					firstDueDate: new Date(body.firstDueDate),
					installmentAmount,
					interestRate: body.interestRate,
					lender: body.lender,
					principalAmount: body.principalAmount,
					startDate: new Date(body.startDate),
					totalInstallments: body.totalInstallments,
					userId: body.userId,
				})
				.returningAll()
				.executeTakeFirstOrThrow();

			// Create payment schedule entries
			const schedule = calculateLoanSchedule(
				body.principalAmount,
				body.interestRate,
				body.totalInstallments,
				(body.amortization ?? "PRICE") as "PRICE" | "SAC",
				new Date(body.startDate),
				new Date(body.firstDueDate),
			);

			const paymentEntries = schedule.map(inst => ({
				dueDate: inst.dueDate,
				installmentNumber: inst.installmentNumber,
				interestPaid: inst.interest,
				loanId: loan.id,
				principalPaid: inst.principal,
				totalPaid: inst.total,
			}));

			await db.insertInto("LoanPayment").values(paymentEntries).execute();

			return loan;
		},
		{
			body: t.Object({
				amortization: t.Optional(AmortizationType),
				description: t.Optional(t.String({ maxLength: 500 })),
				dueDay: t.Number({ maximum: 31, minimum: 1 }),
				firstDueDate: t.String(),
				installmentAmount: t.Optional(t.Number()),
				interestRate: t.Number(),
				lender: t.String({ maxLength: 100 }),
				principalAmount: t.Number(),
				startDate: t.String(),
				totalInstallments: t.Number({ minimum: 1 }),
				userId: t.String({ format: "uuid" }),
			}),
			detail: { tags: ["Loans"] },
		},
	)
	.post(
		"/:id/payments/:installmentNumber/pay",
		async ({ params, body }) => {
			const payment = await db
				.selectFrom("LoanPayment")
				.where("loanId", "=", params.id)
				.where("installmentNumber", "=", Number(params.installmentNumber))
				.selectAll()
				.executeTakeFirst();

			if (!payment) {
				throw new HttpException("Payment not found", 404);
			}

			if (payment.paidDate) {
				throw new HttpException("Payment already made", 400);
			}

			const updatedPayment = await db
				.updateTable("LoanPayment")
				.set({
					accountId: body.accountId,
					advanceType: body.advanceType,
					isAdvanced: body.isAdvanced ?? false,
					paidDate: body.paidDate ? new Date(body.paidDate) : new Date(),
					updatedAt: new Date(),
				})
				.where("id", "=", payment.id)
				.returningAll()
				.executeTakeFirstOrThrow();

			// Update account balance if provided
			if (body.accountId) {
				await db
					.updateTable("Account")
					.set(eb => ({
						balance: eb("balance", "-", Number(payment.totalPaid)),
						updatedAt: new Date(),
					}))
					.where("id", "=", body.accountId)
					.execute();
			}

			return updatedPayment;
		},
		{
			body: t.Object({
				accountId: t.Optional(t.String({ format: "uuid" })),
				advanceType: t.Optional(AdvanceType),
				isAdvanced: t.Optional(t.Boolean()),
				paidDate: t.Optional(t.String()),
			}),
			detail: { tags: ["Loans"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
				installmentNumber: t.String(),
			}),
		},
	)
	.post(
		"/:id/advance",
		async ({ params, body }) => {
			const loan = await db.selectFrom("Loan").where("id", "=", params.id).selectAll().executeTakeFirst();

			if (!loan) {
				throw new HttpException("Loan not found", 404);
			}

			// Get unpaid installments
			const unpaidPayments = await db
				.selectFrom("LoanPayment")
				.where("loanId", "=", params.id)
				.where("paidDate", "is", null)
				.selectAll()
				.orderBy("installmentNumber", body.advanceType === "FRONT" ? "asc" : "desc")
				.limit(body.installmentsToAdvance)
				.execute();

			if (unpaidPayments.length === 0) {
				throw new HttpException("No unpaid installments to advance", 400);
			}

			// Mark installments as paid with advance
			const paidDate = body.paidDate ? new Date(body.paidDate) : new Date();

			for (const payment of unpaidPayments) {
				await db
					.updateTable("LoanPayment")
					.set({
						accountId: body.accountId,
						advanceType: body.advanceType,
						isAdvanced: true,
						paidDate,
						updatedAt: new Date(),
					})
					.where("id", "=", payment.id)
					.execute();
			}

			// Calculate total paid
			const totalPaid = unpaidPayments.reduce((sum, p) => sum + Number(p.totalPaid), 0);

			// Update account balance if provided
			if (body.accountId) {
				await db
					.updateTable("Account")
					.set(eb => ({
						balance: eb("balance", "-", totalPaid),
						updatedAt: new Date(),
					}))
					.where("id", "=", body.accountId)
					.execute();
			}

			return {
				advancedInstallments: unpaidPayments.length,
				advanceType: body.advanceType,
				totalPaid,
			};
		},
		{
			body: t.Object({
				accountId: t.Optional(t.String({ format: "uuid" })),
				advanceType: AdvanceType,
				installmentsToAdvance: t.Number({ minimum: 1 }),
				paidDate: t.Optional(t.String()),
			}),
			detail: { tags: ["Loans"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params }) => {
			const history = await db
				.selectFrom("LoanHistory")
				.where("loanId", "=", params.id)
				.selectAll()
				.orderBy("changedAt", "desc")
				.execute();

			return history;
		},
		{
			detail: { tags: ["Loans"] },
			params: t.Object({
				id: t.String({ format: "uuid" }),
			}),
		},
	);
