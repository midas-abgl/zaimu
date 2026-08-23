import { addMonths, differenceInMonths } from "date-fns";
import Elysia, { t } from "elysia";
import { assertDirectOwnership, requireUserId } from "~/modules/auth";
import { HttpException } from "~/shared/errors";
import { db, executeStatement, numeric, param, queryFirst, queryRows } from "~/shared/infra/sql";

const loanColumns = [
	"id",
	"userId",
	"lender",
	"principalAmount",
	"interestRate",
	"totalInstallments",
	"installmentAmount",
	"dueDay",
	"startDate",
	"firstDueDate",
	"description",
	"amortization",
	"createdAt",
	"updatedAt",
] as const;
const loanPaymentColumns = [
	"id",
	"loanId",
	"financialAccountId",
	"installmentNumber",
	"principalPaid",
	"interestPaid",
	"totalPaid",
	"dueDate",
	"paidDate",
	"isAdvanced",
	"advanceType",
	"createdAt",
	"updatedAt",
] as const;

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
		async ({ request }) => {
			const userId = await requireUserId(request);
			const loans = await queryRows(
				db.sql.public.Loan.select(...loanColumns)
					.where((fields, functions) => functions.eq(fields.userId, userId))
					.orderBy("startDate", { direction: "desc" })
					.build(),
			);

			// Get payment info for each loan
			const loansWithPayments = await Promise.all(
				loans.map(async loan => {
					const payments = await queryRows(
						db.sql.public.LoanPayment.select(...loanPaymentColumns)
							.where((fields, functions) =>
								functions.and(
									functions.eq(fields.loanId, loan.id),
									functions.raw`${fields.paidDate} IS NOT NULL`.returns("pg/bool@1"),
								),
							)
							.build(),
					);

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
			query: t.Object({}),
		},
	)
	.get(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Loan", params.id, userId);
			const loan = await queryFirst(
				db.sql.public.Loan.select(...loanColumns)
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!loan) {
				throw new HttpException("Loan not found", 404);
			}

			const payments = await queryRows(
				db.sql.public.LoanPayment.select(...loanPaymentColumns)
					.where((fields, functions) => functions.eq(fields.loanId, params.id))
					.orderBy("installmentNumber", { direction: "asc" })
					.build(),
			);

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
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/early-payoff",
		async ({ params, query, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Loan", params.id, userId);
			const loan = await queryFirst(
				db.sql.public.Loan.select(...loanColumns)
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!loan) {
				throw new HttpException("Loan not found", 404);
			}

			const paidPayments = await queryRows(
				db.sql.public.LoanPayment.select(...loanPaymentColumns)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.loanId, params.id),
							functions.raw`${fields.paidDate} IS NOT NULL`.returns("pg/bool@1"),
						),
					)
					.build(),
			);

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
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
			query: t.Object({
				advanceType: t.Optional(AdvanceType),
				targetDate: t.Optional(t.String()),
			}),
		},
	)
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
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

			const loan = await queryFirst(
				db.sql.public.Loan.insert([
					{
						amortization: body.amortization ?? "PRICE",
						description: body.description,
						dueDay: body.dueDay,
						firstDueDate: new Date(body.firstDueDate),
						installmentAmount: String(installmentAmount),
						interestRate: String(body.interestRate),
						lender: body.lender,
						principalAmount: String(body.principalAmount),
						startDate: new Date(body.startDate),
						totalInstallments: body.totalInstallments,
						userId,
					},
				])
					.returning(...loanColumns)
					.build(),
			);
			if (!loan) throw new HttpException("Loan not created", 500);

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
				interestPaid: String(inst.interest),
				loanId: loan.id,
				principalPaid: String(inst.principal),
				totalPaid: String(inst.total),
			}));

			if (paymentEntries.length > 0)
				await executeStatement(db.sql.public.LoanPayment.insert(paymentEntries).build());

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
			}),
			detail: { tags: ["Loans"] },
		},
	)
	.post(
		"/:id/payments/:installmentNumber/pay",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Loan", params.id, userId);
			if (body.financialAccountId)
				await assertDirectOwnership("FinancialAccount", body.financialAccountId, userId);
			const payment = await queryFirst(
				db.sql.public.LoanPayment.select(...loanPaymentColumns)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.loanId, params.id),
							functions.eq(fields.installmentNumber, Number(params.installmentNumber)),
						),
					)
					.limit(1)
					.build(),
			);

			if (!payment) {
				throw new HttpException("Payment not found", 404);
			}

			if (payment.paidDate) {
				throw new HttpException("Payment already made", 400);
			}

			const updatedPayment = await queryFirst(
				db.sql.public.LoanPayment.update({
					advanceType: body.advanceType,
					financialAccountId: body.financialAccountId,
					isAdvanced: body.isAdvanced ?? false,
					paidDate: body.paidDate ? new Date(body.paidDate) : new Date(),
					updatedAt: new Date(),
				})
					.where((fields, functions) => functions.eq(fields.id, payment.id))
					.returning(...loanPaymentColumns)
					.build(),
			);
			if (!updatedPayment) throw new HttpException("Payment not found", 404);

			// Update account balance if provided
			if (body.financialAccountId) {
				const amount = param(numeric<12, 2>(payment.totalPaid), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.FinancialAccount.update((fields, functions) => ({
						balance: functions.raw`${fields.balance} - ${amount}`.returns("pg/numeric@1"),
						updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((fields, functions) => functions.eq(fields.id, body.financialAccountId!))
						.build(),
				);
			}

			return updatedPayment;
		},
		{
			body: t.Object({
				advanceType: t.Optional(AdvanceType),
				financialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				isAdvanced: t.Optional(t.Boolean()),
				paidDate: t.Optional(t.String()),
			}),
			detail: { tags: ["Loans"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
				installmentNumber: t.String(),
			}),
		},
	)
	.post(
		"/:id/advance",
		async ({ params, body, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Loan", params.id, userId);
			if (body.financialAccountId)
				await assertDirectOwnership("FinancialAccount", body.financialAccountId, userId);
			const loan = await queryFirst(
				db.sql.public.Loan.select("id")
					.where((fields, functions) => functions.eq(fields.id, params.id))
					.limit(1)
					.build(),
			);

			if (!loan) {
				throw new HttpException("Loan not found", 404);
			}

			// Get unpaid installments
			const unpaidPayments = await queryRows(
				db.sql.public.LoanPayment.select(...loanPaymentColumns)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.loanId, params.id),
							functions.raw`${fields.paidDate} IS NULL`.returns("pg/bool@1"),
						),
					)
					.orderBy("installmentNumber", { direction: body.advanceType === "FRONT" ? "asc" : "desc" })
					.limit(body.installmentsToAdvance)
					.build(),
			);

			if (unpaidPayments.length === 0) {
				throw new HttpException("No unpaid installments to advance", 400);
			}

			// Mark installments as paid with advance
			const paidDate = body.paidDate ? new Date(body.paidDate) : new Date();

			for (const payment of unpaidPayments) {
				await executeStatement(
					db.sql.public.LoanPayment.update({
						advanceType: body.advanceType,
						financialAccountId: body.financialAccountId,
						isAdvanced: true,
						paidDate,
						updatedAt: new Date(),
					})
						.where((fields, functions) => functions.eq(fields.id, payment.id))
						.build(),
				);
			}

			// Calculate total paid
			const totalPaid = unpaidPayments.reduce((sum, p) => sum + Number(p.totalPaid), 0);

			// Update account balance if provided
			if (body.financialAccountId) {
				const amount = param(numeric<12, 2>(totalPaid), { codecId: "pg/numeric@1" });
				await executeStatement(
					db.sql.public.FinancialAccount.update((fields, functions) => ({
						balance: functions.raw`${fields.balance} - ${amount}`.returns("pg/numeric@1"),
						updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
					}))
						.where((fields, functions) => functions.eq(fields.id, body.financialAccountId!))
						.build(),
				);
			}

			return {
				advancedInstallments: unpaidPayments.length,
				advanceType: body.advanceType,
				totalPaid,
			};
		},
		{
			body: t.Object({
				advanceType: AdvanceType,
				financialAccountId: t.Optional(t.String({ maxLength: 36, minLength: 1 })),
				installmentsToAdvance: t.Number({ minimum: 1 }),
				paidDate: t.Optional(t.String()),
			}),
			detail: { tags: ["Loans"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	)
	.get(
		"/:id/history",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			await assertDirectOwnership("Loan", params.id, userId);
			const history = await queryRows(
				db.sql.public.LoanHistory.select("id", "loanId", "field", "oldValue", "newValue", "changedAt")
					.where((fields, functions) => functions.eq(fields.loanId, params.id))
					.orderBy("changedAt", { direction: "desc" })
					.build(),
			);

			return history;
		},
		{
			detail: { tags: ["Loans"] },
			params: t.Object({
				id: t.String({ maxLength: 36, minLength: 1 }),
			}),
		},
	);
