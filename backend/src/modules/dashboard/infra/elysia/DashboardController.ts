import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import Elysia from "elysia";
import { getFinancialAccountBalances } from "~/modules/accounts/application/get-financial-account-balances";
import { requireUserId } from "~/modules/auth";
import { getDebtBalanceTotals } from "~/modules/debts/application";
import { materializeSalaryTransactions } from "~/modules/salaries/application/materialize-salary-transactions";
import { db, queryFirst, queryRows } from "~/shared/infra/sql";

export const DashboardController = new Elysia({ prefix: "/dashboard" }).get(
	"/",
	async ({ request }) => {
		const userId = await requireUserId(request);
		await materializeSalaryTransactions(userId);
		const now = new Date();
		const currentMonthStart = startOfMonth(now);
		const currentMonthEnd = endOfMonth(now);
		const lastMonthStart = startOfMonth(subMonths(now, 1));
		const lastMonthEnd = endOfMonth(subMonths(now, 1));

		// Get accounts summary
		const accounts = await queryRows(
			db.sql.public.FinancialAccount.select("id", "name", "type")
				.where((f, fn) => fn.eq(f.userId, userId))
				.build(),
		);
		const accountIds = accounts.map(account => account.id);

		const balances = await getFinancialAccountBalances(accountIds);
		const totalBalance = accounts
			.filter(account => account.type !== "CREDIT_CARD")
			.reduce((sum, account) => sum + (balances.get(account.id) ?? 0), 0);

		// Get current month income
		const getTransactionTotal = async (type: "INCOME" | "EXPENSE", start: Date, end: Date) => {
			if (accountIds.length === 0) return { total: 0 };
			return queryFirst(
				db.sql.public.Transaction.select("total", (f, fn) =>
					fn.raw`COALESCE(SUM(${f.amount}), 0)`.returns("pg/numeric@1"),
				)
					.where((f, fn) =>
						fn.and(
							fn.eq(f.type, type),
							fn.gte(f.date, start),
							fn.lte(f.date, end),
							fn.or(
								fn.in(f.destinationFinancialAccountId, accountIds),
								fn.in(f.originFinancialAccountId, accountIds),
							),
						),
					)
					.build(),
			);
		};
		const [currentMonthIncome, currentMonthExpenses, lastMonthIncome, lastMonthExpenses] = await Promise.all([
			getTransactionTotal("INCOME", currentMonthStart, currentMonthEnd),
			getTransactionTotal("EXPENSE", currentMonthStart, currentMonthEnd),
			getTransactionTotal("INCOME", lastMonthStart, lastMonthEnd),
			getTransactionTotal("EXPENSE", lastMonthStart, lastMonthEnd),
		]);

		// Get upcoming bills (subscriptions due this month)
		const subscriptions = await queryRows(
			db.sql.public.Subscription.select("id", "name", "amount", "billingDay", "isActive")
				.where((f, fn) => fn.and(fn.eq(f.userId, userId), fn.eq(f.isActive, true)))
				.build(),
		);

		const upcomingBills = subscriptions.filter(s => s.billingDay >= now.getDate());

		// Get pending credit card statements
		const creditCards = await queryRows(
			db.sql.public.CreditCard.innerJoin(db.sql.public.FinancialAccount, (f, fn) =>
				fn.eq(f.CreditCard.financialAccountId, f.FinancialAccount.id),
			)
				.select(f => ({ id: f.CreditCard.id, name: f.FinancialAccount.name }))
				.where((f, fn) => fn.eq(f.FinancialAccount.userId, userId))
				.build(),
		);

		const cardIds = creditCards.map(card => card.id);
		const pendingStatements =
			cardIds.length === 0
				? []
				: await queryRows(
						db.sql.public.CreditCardStatement.select(
							"id",
							"creditCardId",
							"statementDate",
							"dueDate",
							"totalAmount",
							"paidAmount",
							"isPaid",
							"createdAt",
							"updatedAt",
						)
							.where((f, fn) =>
								fn.and(fn.in(f.creditCardId, cardIds), fn.eq(f.isPaid, false), fn.gte(f.dueDate, now)),
							)
							.orderBy("dueDate", { direction: "asc" })
							.build(),
					);

		// Get active loans summary
		const loans = await queryRows(
			db.sql.public.Loan.select("id", "lender", "totalInstallments", "installmentAmount")
				.where((f, fn) => fn.eq(f.userId, userId))
				.build(),
		);

		const loansWithPayments = await Promise.all(
			loans.map(async loan => {
				const paidCount = await queryFirst(
					db.sql.public.LoanPayment.select("count", (f, fn) => fn.raw`COUNT(${f.id})`.returns("pg/int8@1"))
						.where((f, fn) =>
							fn.and(fn.eq(f.loanId, loan.id), fn.raw`${f.paidDate} IS NOT NULL`.returns("pg/bool@1")),
						)
						.build(),
				);

				const remainingInstallments = loan.totalInstallments - Number(paidCount?.count ?? 0);
				const remainingAmount = remainingInstallments * Number(loan.installmentAmount);

				return {
					id: loan.id,
					installmentAmount: Number(loan.installmentAmount),
					lender: loan.lender,
					remainingAmount,
					remainingInstallments,
				};
			}),
		);

		const activeLoans = loansWithPayments.filter(l => l.remainingInstallments > 0);

		const debtsSummary = await getDebtBalanceTotals(userId);

		// Recent transactions
		const recentTransactions =
			accountIds.length === 0
				? []
				: await queryRows(
						db.sql.public.Transaction.outerLeftJoin(db.sql.public.Category, (f, fn) =>
							fn.eq(f.Transaction.categoryId, f.Category.id),
						)
							.select(f => ({
								amount: f.Transaction.amount,
								categoryColor: f.Category.color,
								categoryName: f.Category.name,
								date: f.Transaction.date,
								description: f.Transaction.description,
								id: f.Transaction.id,
								time: f.Transaction.time,
								type: f.Transaction.type,
							}))
							.where((f, fn) =>
								fn.or(
									fn.in(f.Transaction.destinationFinancialAccountId, accountIds),
									fn.in(f.Transaction.originFinancialAccountId, accountIds),
								),
							)
							.orderBy(f => f.Transaction.date, { direction: "desc" })
							.orderBy(f => f.Transaction.createdAt, { direction: "desc" })
							.limit(10)
							.build(),
					);

		return {
			accounts: accounts.map(account => ({
				...account,
				balance: account.type === "CREDIT_CARD" ? null : (balances.get(account.id) ?? 0),
			})),
			debts: {
				...debtsSummary,
				net: debtsSummary.owedToMe - debtsSummary.iOwe,
			},
			loans: {
				active: activeLoans,
				monthlyPayment: activeLoans.reduce((sum, l) => sum + l.installmentAmount, 0),
				totalRemaining: activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0),
			},
			pendingStatements: pendingStatements.map(s => ({
				...s,
				paidAmount: Number(s.paidAmount),
				totalAmount: Number(s.totalAmount),
			})),
			recentTransactions,
			summary: {
				currentMonth: {
					expenses: Number(currentMonthExpenses?.total ?? 0),
					income: Number(currentMonthIncome?.total ?? 0),
					net: Number(currentMonthIncome?.total ?? 0) - Number(currentMonthExpenses?.total ?? 0),
				},
				lastMonth: {
					expenses: Number(lastMonthExpenses?.total ?? 0),
					income: Number(lastMonthIncome?.total ?? 0),
				},
				totalBalance,
			},
			upcomingBills: upcomingBills.map(s => ({
				amount: Number(s.amount),
				dueDay: s.billingDay,
				id: s.id,
				name: s.name,
			})),
		};
	},
	{
		detail: { tags: ["Dashboard"] },
	},
);
