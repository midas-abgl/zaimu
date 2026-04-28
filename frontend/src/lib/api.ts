const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

interface FetchOptions {
	method?: "GET" | "POST" | "PATCH" | "DELETE";
	body?: unknown;
	params?: Record<string, string | number | boolean | undefined>;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
	const { method = "GET", body, params } = options;

	let url = `${API_URL}${endpoint}`;

	if (params) {
		const searchParams = new URLSearchParams();
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				searchParams.append(key, String(value));
			}
		}
		const queryString = searchParams.toString();
		if (queryString) {
			url += `?${queryString}`;
		}
	}

	const response = await fetch(url, {
		body: body ? JSON.stringify(body) : undefined,
		headers: {
			"Content-Type": "application/json",
		},
		method,
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: "Unknown error" }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	return response.json();
}

// Types
export interface User {
	id: string;
	email: string;
	name?: string;
	createdAt: string;
}

export interface Account {
	id: string;
	userId: string;
	name: string;
	type: "CHECKING" | "SAVINGS" | "INVESTMENT" | "CASH" | "CREDIT_CARD";
	balance: number;
	createdAt: string;
	updatedAt: string;
	creditCard?: CreditCard;
}

export interface CreditCard {
	id: string;
	accountId: string;
	creditLimit: number;
	statementDay: number;
	dueDay: number;
	workingDueDate: boolean;
	accountName?: string;
}

export interface Transaction {
	id: string;
	amount: number;
	date: string;
	description?: string;
	type: "INCOME" | "EXPENSE" | "TRANSFER";
	categoryId?: string;
	categoryName?: string;
	categoryColor?: string;
	originId?: string;
	destinationId?: string;
	createdAt: string;
}

export interface Category {
	id: string;
	userId: string;
	name: string;
	color?: string;
	icon?: string;
	parentId?: string;
}

export interface Loan {
	id: string;
	userId: string;
	lender: string;
	principalAmount: number;
	interestRate: number;
	totalInstallments: number;
	installmentAmount: number;
	dueDay: number;
	startDate: string;
	firstDueDate: string;
	description?: string;
	amortization: "PRICE" | "SAC" | "SACRE";
	paidInstallments?: number;
	remainingInstallments?: number;
	totalPaid?: number;
}

export interface LoanPayment {
	id: string;
	loanId: string;
	installmentNumber: number;
	principalPaid: number;
	interestPaid: number;
	totalPaid: number;
	dueDate: string;
	paidDate?: string;
	isAdvanced: boolean;
	advanceType?: "FRONT" | "BACK";
}

export interface EarlyPayoff {
	loanId: string;
	targetDate: string;
	advanceType: "FRONT" | "BACK";
	paidInstallments: number;
	totalToPay: number;
	savedInterest: number;
	remainingPrincipal: number;
}

export interface Debt {
	id: string;
	userId: string;
	personName: string;
	amount: number;
	description?: string;
	isOwedToMe: boolean;
	date: string;
	dueDate?: string;
	isPaid: boolean;
	paidDate?: string;
}

export interface Salary {
	id: string;
	userId: string;
	source: string;
	grossAmount: number;
	netAmount: number;
	frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
	payDay: number;
	startDate: string;
	endDate?: string;
	isActive: boolean;
}

export interface Subscription {
	id: string;
	userId: string;
	name: string;
	amount: number;
	billingDay: number;
	frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
	paymentMethod: "DEBIT" | "CREDIT" | "PIX" | "CASH" | "TRANSFER" | "BOLETO";
	startDate: string;
	endDate?: string;
	isActive: boolean;
}

export interface RecurringPayment {
	id: string;
	userId: string;
	name: string;
	amount: number;
	frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
	dayOfMonth?: number;
	dayOfWeek?: number;
	startDate: string;
	endDate?: string;
	categoryId?: string;
	paymentMethod: "DEBIT" | "CREDIT" | "PIX" | "CASH" | "TRANSFER" | "BOLETO";
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	category?: string;
	day?: number;
	type?: "INCOME" | "EXPENSE";
}

export interface CreditCardStatement {
	id: string;
	creditCardId: string;
	statementDate: string;
	dueDate: string;
	totalAmount: number;
	paidAmount: number;
	isPaid: boolean;
}

export interface Dashboard {
	summary: {
		totalBalance: number;
		currentMonth: {
			income: number;
			expenses: number;
			net: number;
		};
		lastMonth: {
			income: number;
			expenses: number;
		};
	};
	accounts: Array<{
		id: string;
		name: string;
		type: string;
		balance: number;
	}>;
	upcomingBills: Array<{
		id: string;
		name: string;
		amount: number;
		dueDay: number;
	}>;
	pendingStatements: CreditCardStatement[];
	loans: {
		active: Array<{
			id: string;
			lender: string;
			remainingInstallments: number;
			remainingAmount: number;
			installmentAmount: number;
		}>;
		totalRemaining: number;
		monthlyPayment: number;
	};
	debts: {
		owedToMe: number;
		iOwe: number;
		net: number;
	};
	recentTransactions: Transaction[];
}

// API functions
export const api = {
	addCreditPurchase: (
		cardId: string,
		data: {
			description: string;
			totalAmount: number;
			installments?: number;
			purchaseDate: string;
			categoryId?: string;
		},
	) => fetchApi(`/credit-cards/${cardId}/purchases`, { body: data, method: "POST" }),

	advanceLoan: (
		loanId: string,
		data: {
			installmentsToAdvance: number;
			advanceType: "FRONT" | "BACK";
			paidDate?: string;
			accountId?: string;
		},
	) => fetchApi(`/loans/${loanId}/advance`, { body: data, method: "POST" }),

	createAccount: (data: {
		userId: string;
		name: string;
		type?: Account["type"];
		balance?: number;
		creditCard?: {
			creditLimit: number;
			statementDay: number;
			dueDay: number;
			workingDueDate?: boolean;
		};
	}) => fetchApi<Account>("/accounts", { body: data, method: "POST" }),

	createCategory: (data: {
		userId: string;
		name: string;
		color?: string;
		icon?: string;
		parentId?: string;
	}) => fetchApi<Category>("/categories", { body: data, method: "POST" }),

	createDebt: (data: {
		userId: string;
		personName: string;
		amount: number;
		description?: string;
		isOwedToMe?: boolean;
		date: string;
		dueDate?: string;
	}) => fetchApi<Debt>("/debts", { body: data, method: "POST" }),

	createLoan: (data: {
		userId: string;
		lender: string;
		principalAmount: number;
		interestRate: number;
		totalInstallments: number;
		installmentAmount?: number;
		dueDay: number;
		startDate: string;
		firstDueDate: string;
		description?: string;
		amortization?: Loan["amortization"];
	}) => fetchApi<Loan>("/loans", { body: data, method: "POST" }),

	createRecurringPayment: (data: {
		userId: string;
		name: string;
		amount: number;
		frequency: RecurringPayment["frequency"];
		day?: number;
		category?: string;
		type?: RecurringPayment["type"];
	}) =>
		fetchApi<RecurringPayment>("/recurring", {
			body: {
				amount: data.amount,
				dayOfMonth: data.day,
				frequency: data.frequency,
				name: data.name,
				startDate: new Date().toISOString().slice(0, 10),
				userId: data.userId,
			},
			method: "POST",
		}),

	createSalary: (data: {
		userId: string;
		source: string;
		grossAmount: number;
		netAmount: number;
		frequency?: Salary["frequency"];
		payDay: number;
		startDate: string;
		endDate?: string;
	}) => fetchApi<Salary>("/salaries", { body: data, method: "POST" }),

	createSubscription: (data: {
		userId: string;
		name: string;
		amount: number;
		billingDay: number;
		frequency?: Subscription["frequency"];
		paymentMethod?: Subscription["paymentMethod"];
		startDate: string;
		endDate?: string;
	}) => fetchApi<Subscription>("/subscriptions", { body: data, method: "POST" }),

	createTransaction: (data: {
		amount: number;
		date: string;
		description?: string;
		type?: Transaction["type"];
		categoryId?: string;
		originId?: string;
		destinationId?: string;
	}) => fetchApi<Transaction>("/transactions", { body: data, method: "POST" }),

	deleteAccount: (id: string) => fetchApi<{ success: boolean }>(`/accounts/${id}`, { method: "DELETE" }),

	deleteRecurringPayment: (id: string) =>
		fetchApi<{ success: boolean }>(`/recurring/${id}`, { method: "DELETE" }),

	deleteTransaction: (id: string) =>
		fetchApi<{ success: boolean }>(`/transactions/${id}`, { method: "DELETE" }),

	getAccount: (id: string) => fetchApi<Account>(`/accounts/${id}`),

	// Accounts
	getAccounts: (userId?: string) => fetchApi<Account[]>("/accounts", { params: { userId } }),

	// Categories
	getCategories: (userId?: string) => fetchApi<Category[]>("/categories", { params: { userId } }),

	getCreditCardStatements: (cardId: string, isPaid?: boolean) =>
		fetchApi<CreditCardStatement[]>(`/credit-cards/${cardId}/statements`, {
			params: { isPaid },
		}),

	// Credit Cards
	getCreditCards: (userId?: string) => fetchApi<CreditCard[]>("/credit-cards", { params: { userId } }),

	// Dashboard
	getDashboard: (userId: string) => fetchApi<Dashboard>("/dashboard", { params: { userId } }),

	// Debts
	getDebts: (params?: { userId?: string; isOwedToMe?: boolean; isPaid?: boolean; personName?: string }) =>
		fetchApi<{
			debts: Debt[];
			totals: { owedToMe: number; iOwe: number; net: number };
		}>("/debts", { params }),

	getDebtsSummary: (userId: string) =>
		fetchApi<
			Array<{
				person: string;
				owedToMe: number;
				iOwe: number;
				netBalance: number;
				debtCount: number;
			}>
		>("/debts/summary", { params: { userId } }),

	getEarlyPayoff: (loanId: string, params?: { targetDate?: string; advanceType?: "FRONT" | "BACK" }) =>
		fetchApi<EarlyPayoff>(`/loans/${loanId}/early-payoff`, { params }),

	getLoan: (id: string) => fetchApi<Loan & { payments: LoanPayment[]; schedule: unknown[] }>(`/loans/${id}`),

	// Loans
	getLoans: (userId?: string) => fetchApi<Loan[]>("/loans", { params: { userId } }),

	getRecurringPayments: async (params?: { userId?: string; isActive?: boolean }) => {
		const payments = await fetchApi<RecurringPayment[]>("/recurring", { params });

		return payments.map(payment => ({
			...payment,
			day: payment.dayOfMonth ?? payment.dayOfWeek ?? 1,
			type: payment.type ?? "EXPENSE",
		}));
	},

	// Salaries
	getSalaries: (params?: { userId?: string; isActive?: boolean }) =>
		fetchApi<Salary[]>("/salaries", { params }),

	// Subscriptions
	getSubscriptions: (params?: { userId?: string; isActive?: boolean }) =>
		fetchApi<{ subscriptions: Subscription[]; totalMonthlyCost: number }>("/subscriptions", { params }),

	getTransaction: (id: string) => fetchApi<Transaction>(`/transactions/${id}`),

	// Transactions
	getTransactions: (params?: {
		startDate?: string;
		endDate?: string;
		type?: Transaction["type"];
		categoryId?: string;
		accountId?: string;
		limit?: number;
		offset?: number;
	}) => fetchApi<Transaction[]>("/transactions", { params }),

	getUser: (id: string) => fetchApi<User>(`/users/${id}`),

	login: (data: { email: string; password: string }) =>
		fetchApi<User>("/users/login", { body: data, method: "POST" }),

	payLoanInstallment: (
		loanId: string,
		installmentNumber: number,
		data: {
			paidDate?: string;
			accountId?: string;
			isAdvanced?: boolean;
			advanceType?: "FRONT" | "BACK";
		},
	) =>
		fetchApi(`/loans/${loanId}/payments/${installmentNumber}/pay`, {
			body: data,
			method: "POST",
		}),

	payStatement: (cardId: string, statementId: string, data: { amount?: number; accountId?: string }) =>
		fetchApi(`/credit-cards/${cardId}/statements/${statementId}/pay`, {
			body: data,
			method: "POST",
		}),

	recordSalaryPayment: (
		salaryId: string,
		data: { accountId: string; amount: number; date: string; notes?: string },
	) => fetchApi(`/salaries/${salaryId}/payments`, { body: data, method: "POST" }),
	// Users
	register: (data: { email: string; password: string; name?: string }) =>
		fetchApi<User>("/users/register", { body: data, method: "POST" }),

	updateAccount: (id: string, data: Partial<Account>) =>
		fetchApi<Account>(`/accounts/${id}`, { body: data, method: "PATCH" }),

	updateDebt: (id: string, data: Partial<Debt>) =>
		fetchApi<Debt>(`/debts/${id}`, { body: data, method: "PATCH" }),

	updateSubscription: (id: string, data: Partial<Subscription>) =>
		fetchApi<Subscription>(`/subscriptions/${id}`, { body: data, method: "PATCH" }),

	updateTransaction: (id: string, data: Partial<Transaction>) =>
		fetchApi<Transaction>(`/transactions/${id}`, { body: data, method: "PATCH" }),
};

export default api;
