import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import Elysia from "elysia";
import { requireUserId } from "~/modules/auth";
import { db } from "~/shared/infra/sql";

export const DashboardController = new Elysia({ prefix: "/dashboard" }).get(
	"/",
	async ({ request }) => {
		const userId = await requireUserId(request);
		const now = new Date();
		const currentMonthStart = startOfMonth(now);
		const currentMonthEnd = endOfMonth(now);
		const lastMonthStart = startOfMonth(subMonths(now, 1));
		const lastMonthEnd = endOfMonth(subMonths(now, 1));

		// Get accounts summary
		const accounts = await db
			.selectFrom("FinancialAccount")
			.where("userId", "=", userId)
			.select(["id", "name", "type", "balance"])
			.execute();

		const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

		// Get current month income
		const currentMonthIncome = await db
			.selectFrom("Transaction")
			.where("type", "=", "INCOME")
			.where("date", ">=", currentMonthStart)
			.where("date", "<=", currentMonthEnd)
			.where(eb =>
				eb.or([
					eb(
						"destinationFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
					eb(
						"originFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
				]),
			)
			.select(eb => eb.fn.sum("amount").as("total"))
			.executeTakeFirst();

		// Get current month expenses
		const currentMonthExpenses = await db
			.selectFrom("Transaction")
			.where("type", "=", "EXPENSE")
			.where("date", ">=", currentMonthStart)
			.where("date", "<=", currentMonthEnd)
			.where(eb =>
				eb.or([
					eb(
						"destinationFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
					eb(
						"originFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
				]),
			)
			.select(eb => eb.fn.sum("amount").as("total"))
			.executeTakeFirst();

		// Get last month totals for comparison
		const lastMonthIncome = await db
			.selectFrom("Transaction")
			.where("type", "=", "INCOME")
			.where("date", ">=", lastMonthStart)
			.where("date", "<=", lastMonthEnd)
			.where(eb =>
				eb.or([
					eb(
						"destinationFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
					eb(
						"originFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
				]),
			)
			.select(eb => eb.fn.sum("amount").as("total"))
			.executeTakeFirst();

		const lastMonthExpenses = await db
			.selectFrom("Transaction")
			.where("type", "=", "EXPENSE")
			.where("date", ">=", lastMonthStart)
			.where("date", "<=", lastMonthEnd)
			.where(eb =>
				eb.or([
					eb(
						"destinationFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
					eb(
						"originFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
				]),
			)
			.select(eb => eb.fn.sum("amount").as("total"))
			.executeTakeFirst();

		// Get upcoming bills (subscriptions due this month)
		const subscriptions = await db
			.selectFrom("Subscription")
			.where("userId", "=", userId)
			.where("isActive", "=", true)
			.selectAll()
			.execute();

		const upcomingBills = subscriptions.filter(s => s.billingDay >= now.getDate());

		// Get pending credit card statements
		const creditCards = await db
			.selectFrom("CreditCard")
			.innerJoin("FinancialAccount", "FinancialAccount.id", "CreditCard.financialAccountId")
			.where("FinancialAccount.userId", "=", userId)
			.select(["CreditCard.id", "FinancialAccount.name"])
			.execute();

		const pendingStatements = await db
			.selectFrom("CreditCardStatement")
			.where(
				"creditCardId",
				"in",
				creditCards.map(c => c.id),
			)
			.where("isPaid", "=", false)
			.where("dueDate", ">=", now)
			.selectAll()
			.orderBy("dueDate", "asc")
			.execute();

		// Get active loans summary
		const loans = await db.selectFrom("Loan").where("userId", "=", userId).selectAll().execute();

		const loansWithPayments = await Promise.all(
			loans.map(async loan => {
				const paidCount = await db
					.selectFrom("LoanPayment")
					.where("loanId", "=", loan.id)
					.where("paidDate", "is not", null)
					.select(eb => eb.fn.count("id").as("count"))
					.executeTakeFirst();

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

		// Get debts summary
		const debts = await db
			.selectFrom("Debt")
			.where("userId", "=", userId)
			.where("isPaid", "=", false)
			.selectAll()
			.execute();

		const debtsSummary = debts.reduce(
			(acc, debt) => {
				const amount = Number(debt.amount);
				if (debt.isOwedToMe) {
					acc.owedToMe += amount;
				} else {
					acc.iOwe += amount;
				}
				return acc;
			},
			{ iOwe: 0, owedToMe: 0 },
		);

		// Recent transactions
		const recentTransactions = await db
			.selectFrom("Transaction")
			.leftJoin("Category", "Category.id", "Transaction.categoryId")
			.where(eb =>
				eb.or([
					eb(
						"Transaction.destinationFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
					eb(
						"Transaction.originFinancialAccountId",
						"in",
						accounts.map(a => a.id),
					),
				]),
			)
			.select([
				"Transaction.id",
				"Transaction.amount",
				"Transaction.date",
				"Transaction.description",
				"Transaction.type",
				"Category.name as categoryName",
				"Category.color as categoryColor",
			])
			.orderBy("Transaction.date", "desc")
			.orderBy("Transaction.createdAt", "desc")
			.limit(10)
			.execute();

		return {
			accounts: accounts.map(a => ({
				...a,
				balance: Number(a.balance),
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
