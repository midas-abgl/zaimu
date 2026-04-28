/**
 * Data Service - Abstracts local vs remote data operations
 *
 * When in guest mode: All operations use IndexedDB
 * When authenticated: Operations use backend API with local caching
 */

import { getAuthHeader, useAuthStore } from "@/stores/auth";
import type { Account, Category, Dashboard, Debt, Loan, Salary, Subscription, Transaction } from "./api";
import {
	clearAllLocalData,
	localAccounts,
	localCategories,
	localDebts,
	localLoans,
	localMeta,
	localSalaries,
	localSubscriptions,
	localTransactions,
} from "./localStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

// Check if we're in guest mode or authenticated
function isGuestMode(): boolean {
	const state = useAuthStore.getState();
	return state.isGuestMode || (!state.isAuthenticated && !state.token);
}

function getUserId(): string {
	const state = useAuthStore.getState();
	return state.user?.id || state.guestId;
}

// Generic authenticated fetch
async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${API_URL}${endpoint}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...getAuthHeader(),
			...options.headers,
		},
	});

	if (!response.ok) {
		if (response.status === 401) {
			// Token expired, try to refresh
			const refreshed = await useAuthStore.getState().refreshToken();
			if (refreshed) {
				// Retry with new token
				return fetchWithAuth(endpoint, options);
			}
			throw new Error("Session expired. Please log in again.");
		}
		const error = await response.json().catch(() => ({ error: "Unknown error" }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	return response.json();
}

// ============== ACCOUNTS ==============
export const dataService = {
	accounts: {
		async create(data: Omit<Account, "id" | "createdAt" | "updatedAt" | "userId">): Promise<Account> {
			const userId = getUserId();
			if (isGuestMode()) {
				const newAccount: Account = {
					...data,
					createdAt: new Date().toISOString(),
					id: crypto.randomUUID(),
					updatedAt: new Date().toISOString(),
					userId,
				};
				await localAccounts.put(newAccount, newAccount.id);
				return newAccount;
			}
			const account = await fetchWithAuth<Account>("/accounts", {
				body: JSON.stringify({ ...data, userId }),
				method: "POST",
			});
			await localAccounts.put(account, account.id);
			return account;
		},

		async delete(id: string): Promise<void> {
			if (isGuestMode()) {
				await localAccounts.delete(id);
				return;
			}
			await fetchWithAuth(`/accounts/${id}`, { method: "DELETE" });
			await localAccounts.delete(id);
		},
		async getAll(): Promise<Account[]> {
			if (isGuestMode()) {
				const local = await localAccounts.getAll();
				return local.map(item => item.data);
			}
			const accounts = await fetchWithAuth<Account[]>(`/accounts?userId=${getUserId()}`);
			// Cache locally
			await localAccounts.bulkPut(accounts.map(a => ({ data: a, localId: a.id, syncedAt: Date.now() })));
			return accounts;
		},

		async getById(id: string): Promise<Account | null> {
			if (isGuestMode()) {
				const local = await localAccounts.getById(id);
				return local?.data || null;
			}
			try {
				return await fetchWithAuth<Account>(`/accounts/${id}`);
			} catch {
				// Fallback to local cache
				const local = await localAccounts.getById(id);
				return local?.data || null;
			}
		},

		async update(id: string, data: Partial<Account>): Promise<Account> {
			if (isGuestMode()) {
				const existing = await localAccounts.getById(id);
				if (!existing) throw new Error("Account not found");
				const updated: Account = {
					...existing.data,
					...data,
					updatedAt: new Date().toISOString(),
				};
				await localAccounts.put(updated, id);
				return updated;
			}
			const account = await fetchWithAuth<Account>(`/accounts/${id}`, {
				body: JSON.stringify(data),
				method: "PATCH",
			});
			await localAccounts.put(account, account.id);
			return account;
		},
	},

	// ============== CATEGORIES ==============
	categories: {
		async create(data: Omit<Category, "id" | "userId">): Promise<Category> {
			const userId = getUserId();
			if (isGuestMode()) {
				const newCategory: Category = {
					...data,
					id: crypto.randomUUID(),
					userId,
				};
				await localCategories.put(newCategory, newCategory.id);
				return newCategory;
			}
			const category = await fetchWithAuth<Category>("/categories", {
				body: JSON.stringify({ ...data, userId }),
				method: "POST",
			});
			await localCategories.put(category, category.id);
			return category;
		},

		async delete(id: string): Promise<void> {
			if (isGuestMode()) {
				await localCategories.delete(id);
				return;
			}
			await fetchWithAuth(`/categories/${id}`, { method: "DELETE" });
			await localCategories.delete(id);
		},
		async getAll(): Promise<Category[]> {
			if (isGuestMode()) {
				const local = await localCategories.getAll();
				return local.map(item => item.data);
			}
			const categories = await fetchWithAuth<Category[]>(`/categories?userId=${getUserId()}`);
			await localCategories.bulkPut(categories.map(c => ({ data: c, localId: c.id, syncedAt: Date.now() })));
			return categories;
		},

		async update(id: string, data: Partial<Category>): Promise<Category> {
			if (isGuestMode()) {
				const existing = await localCategories.getById(id);
				if (!existing) throw new Error("Category not found");
				const updated: Category = { ...existing.data, ...data };
				await localCategories.put(updated, id);
				return updated;
			}
			const category = await fetchWithAuth<Category>(`/categories/${id}`, {
				body: JSON.stringify(data),
				method: "PATCH",
			});
			await localCategories.put(category, category.id);
			return category;
		},
	},

	// ============== DASHBOARD ==============
	dashboard: {
		async get(): Promise<Dashboard> {
			if (isGuestMode()) {
				// Build dashboard from local data
				const [accounts, transactions, loans, debts, subscriptions] = await Promise.all([
					dataService.accounts.getAll(),
					dataService.transactions.getAll(),
					dataService.loans.getAll(),
					dataService.debts.getAll(),
					dataService.subscriptions.getAll(),
				]);

				const now = new Date();
				const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
				const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
				const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
				const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

				const currentMonthTx = transactions.filter(t => t.date >= startOfMonth && t.date <= endOfMonth);
				const lastMonthTx = transactions.filter(t => t.date >= startOfLastMonth && t.date <= endOfLastMonth);

				const currentIncome = currentMonthTx
					.filter(t => t.type === "INCOME")
					.reduce((sum, t) => sum + t.amount, 0);
				const currentExpenses = currentMonthTx
					.filter(t => t.type === "EXPENSE")
					.reduce((sum, t) => sum + t.amount, 0);
				const lastIncome = lastMonthTx.filter(t => t.type === "INCOME").reduce((sum, t) => sum + t.amount, 0);
				const lastExpenses = lastMonthTx
					.filter(t => t.type === "EXPENSE")
					.reduce((sum, t) => sum + t.amount, 0);

				const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
				const owedToMe = debts.filter(d => d.isOwedToMe && !d.isPaid).reduce((sum, d) => sum + d.amount, 0);
				const iOwe = debts.filter(d => !d.isOwedToMe && !d.isPaid).reduce((sum, d) => sum + d.amount, 0);

				return {
					accounts: accounts.map(a => ({
						balance: a.balance,
						id: a.id,
						name: a.name,
						type: a.type,
					})),
					debts: {
						iOwe,
						net: owedToMe - iOwe,
						owedToMe,
					},
					loans: {
						active: loans.map(l => ({
							id: l.id,
							installmentAmount: l.installmentAmount,
							lender: l.lender,
							remainingAmount: l.principalAmount,
							remainingInstallments: l.remainingInstallments || l.totalInstallments,
						})),
						monthlyPayment: loans.reduce((sum, l) => sum + l.installmentAmount, 0),
						totalRemaining: loans.reduce((sum, l) => sum + l.principalAmount, 0),
					},
					pendingStatements: [],
					recentTransactions: transactions.slice(0, 10),
					summary: {
						currentMonth: {
							expenses: currentExpenses,
							income: currentIncome,
							net: currentIncome - currentExpenses,
						},
						lastMonth: {
							expenses: lastExpenses,
							income: lastIncome,
						},
						totalBalance,
					},
					upcomingBills: subscriptions
						.filter(s => s.isActive)
						.map(s => ({
							amount: s.amount,
							dueDay: s.billingDay,
							id: s.id,
							name: s.name,
						})),
				};
			}

			return fetchWithAuth<Dashboard>(`/dashboard?userId=${getUserId()}`);
		},
	},

	// ============== DEBTS ==============
	debts: {
		async create(data: Omit<Debt, "id" | "userId">): Promise<Debt> {
			const userId = getUserId();
			if (isGuestMode()) {
				const newDebt: Debt = {
					...data,
					id: crypto.randomUUID(),
					userId,
				};
				await localDebts.put(newDebt, newDebt.id);
				return newDebt;
			}
			const debt = await fetchWithAuth<Debt>("/debts", {
				body: JSON.stringify({ ...data, userId }),
				method: "POST",
			});
			await localDebts.put(debt, debt.id);
			return debt;
		},

		async delete(id: string): Promise<void> {
			if (isGuestMode()) {
				await localDebts.delete(id);
				return;
			}
			await fetchWithAuth(`/debts/${id}`, { method: "DELETE" });
			await localDebts.delete(id);
		},
		async getAll(): Promise<Debt[]> {
			if (isGuestMode()) {
				const local = await localDebts.getAll();
				return local.map(item => item.data);
			}
			const debts = await fetchWithAuth<Debt[]>(`/debts?userId=${getUserId()}`);
			await localDebts.bulkPut(debts.map(d => ({ data: d, localId: d.id, syncedAt: Date.now() })));
			return debts;
		},

		async update(id: string, data: Partial<Debt>): Promise<Debt> {
			if (isGuestMode()) {
				const existing = await localDebts.getById(id);
				if (!existing) throw new Error("Debt not found");
				const updated: Debt = { ...existing.data, ...data };
				await localDebts.put(updated, id);
				return updated;
			}
			const debt = await fetchWithAuth<Debt>(`/debts/${id}`, {
				body: JSON.stringify(data),
				method: "PATCH",
			});
			await localDebts.put(debt, debt.id);
			return debt;
		},
	},

	// ============== LOANS ==============
	loans: {
		async create(data: Omit<Loan, "id" | "userId">): Promise<Loan> {
			const userId = getUserId();
			if (isGuestMode()) {
				const newLoan: Loan = {
					...data,
					id: crypto.randomUUID(),
					userId,
				};
				await localLoans.put(newLoan, newLoan.id);
				return newLoan;
			}
			const loan = await fetchWithAuth<Loan>("/loans", {
				body: JSON.stringify({ ...data, userId }),
				method: "POST",
			});
			await localLoans.put(loan, loan.id);
			return loan;
		},

		async delete(id: string): Promise<void> {
			if (isGuestMode()) {
				await localLoans.delete(id);
				return;
			}
			await fetchWithAuth(`/loans/${id}`, { method: "DELETE" });
			await localLoans.delete(id);
		},
		async getAll(): Promise<Loan[]> {
			if (isGuestMode()) {
				const local = await localLoans.getAll();
				return local.map(item => item.data);
			}
			const loans = await fetchWithAuth<Loan[]>(`/loans?userId=${getUserId()}`);
			await localLoans.bulkPut(loans.map(l => ({ data: l, localId: l.id, syncedAt: Date.now() })));
			return loans;
		},

		async update(id: string, data: Partial<Loan>): Promise<Loan> {
			if (isGuestMode()) {
				const existing = await localLoans.getById(id);
				if (!existing) throw new Error("Loan not found");
				const updated: Loan = { ...existing.data, ...data };
				await localLoans.put(updated, id);
				return updated;
			}
			const loan = await fetchWithAuth<Loan>(`/loans/${id}`, {
				body: JSON.stringify(data),
				method: "PATCH",
			});
			await localLoans.put(loan, loan.id);
			return loan;
		},
	},

	// ============== SALARIES ==============
	salaries: {
		async create(data: Omit<Salary, "id" | "userId">): Promise<Salary> {
			const userId = getUserId();
			if (isGuestMode()) {
				const newSalary: Salary = {
					...data,
					id: crypto.randomUUID(),
					userId,
				};
				await localSalaries.put(newSalary, newSalary.id);
				return newSalary;
			}
			const salary = await fetchWithAuth<Salary>("/salaries", {
				body: JSON.stringify({ ...data, userId }),
				method: "POST",
			});
			await localSalaries.put(salary, salary.id);
			return salary;
		},

		async delete(id: string): Promise<void> {
			if (isGuestMode()) {
				await localSalaries.delete(id);
				return;
			}
			await fetchWithAuth(`/salaries/${id}`, { method: "DELETE" });
			await localSalaries.delete(id);
		},
		async getAll(): Promise<Salary[]> {
			if (isGuestMode()) {
				const local = await localSalaries.getAll();
				return local.map(item => item.data);
			}
			const salaries = await fetchWithAuth<Salary[]>(`/salaries?userId=${getUserId()}`);
			await localSalaries.bulkPut(salaries.map(s => ({ data: s, localId: s.id, syncedAt: Date.now() })));
			return salaries;
		},

		async update(id: string, data: Partial<Salary>): Promise<Salary> {
			if (isGuestMode()) {
				const existing = await localSalaries.getById(id);
				if (!existing) throw new Error("Salary not found");
				const updated: Salary = { ...existing.data, ...data };
				await localSalaries.put(updated, id);
				return updated;
			}
			const salary = await fetchWithAuth<Salary>(`/salaries/${id}`, {
				body: JSON.stringify(data),
				method: "PATCH",
			});
			await localSalaries.put(salary, salary.id);
			return salary;
		},
	},

	// ============== SUBSCRIPTIONS ==============
	subscriptions: {
		async create(data: Omit<Subscription, "id" | "userId">): Promise<Subscription> {
			const userId = getUserId();
			if (isGuestMode()) {
				const newSubscription: Subscription = {
					...data,
					id: crypto.randomUUID(),
					userId,
				};
				await localSubscriptions.put(newSubscription, newSubscription.id);
				return newSubscription;
			}
			const subscription = await fetchWithAuth<Subscription>("/subscriptions", {
				body: JSON.stringify({ ...data, userId }),
				method: "POST",
			});
			await localSubscriptions.put(subscription, subscription.id);
			return subscription;
		},

		async delete(id: string): Promise<void> {
			if (isGuestMode()) {
				await localSubscriptions.delete(id);
				return;
			}
			await fetchWithAuth(`/subscriptions/${id}`, { method: "DELETE" });
			await localSubscriptions.delete(id);
		},
		async getAll(): Promise<Subscription[]> {
			if (isGuestMode()) {
				const local = await localSubscriptions.getAll();
				return local.map(item => item.data);
			}
			const subscriptions = await fetchWithAuth<Subscription[]>(`/subscriptions?userId=${getUserId()}`);
			await localSubscriptions.bulkPut(
				subscriptions.map(s => ({ data: s, localId: s.id, syncedAt: Date.now() })),
			);
			return subscriptions;
		},

		async update(id: string, data: Partial<Subscription>): Promise<Subscription> {
			if (isGuestMode()) {
				const existing = await localSubscriptions.getById(id);
				if (!existing) throw new Error("Subscription not found");
				const updated: Subscription = { ...existing.data, ...data };
				await localSubscriptions.put(updated, id);
				return updated;
			}
			const subscription = await fetchWithAuth<Subscription>(`/subscriptions/${id}`, {
				body: JSON.stringify(data),
				method: "PATCH",
			});
			await localSubscriptions.put(subscription, subscription.id);
			return subscription;
		},
	},

	// ============== SYNC ==============
	sync: {
		/**
		 * Clear all local data (useful when logging out)
		 */
		async clearLocalData(): Promise<void> {
			await clearAllLocalData();
		},

		/**
		 * Get the last sync timestamp
		 */
		async getLastSyncTime(): Promise<number | null> {
			const timestamp = await localMeta.get("lastSyncAt");
			return timestamp as number | null;
		},
		/**
		 * Sync local data with the server after logging in
		 * This uploads all local data and merges with server data
		 */
		async syncAll(): Promise<{ success: boolean; errors: string[] }> {
			const state = useAuthStore.getState();
			if (!state.isAuthenticated || !state.token) {
				return { errors: ["Not authenticated"], success: false };
			}

			try {
				// Get all local data
				const [accounts, categories, transactions, loans, debts, salaries, subscriptions] = await Promise.all(
					[
						localAccounts.getAll(),
						localCategories.getAll(),
						localTransactions.getAll(),
						localLoans.getAll(),
						localDebts.getAll(),
						localSalaries.getAll(),
						localSubscriptions.getAll(),
					],
				);

				// Send to server
				const response = await fetchWithAuth<{
					syncResults: Record<string, { synced: number; errors: string[] }>;
					serverData: {
						accounts: Account[];
						categories: Category[];
						transactions: Transaction[];
						loans: Loan[];
						debts: Debt[];
						salaries: Salary[];
						subscriptions: Subscription[];
					};
				}>("/users/sync", {
					body: JSON.stringify({
						accounts: accounts.map(a => a.data),
						categories: categories.map(c => c.data),
						debts: debts.map(d => d.data),
						loans: loans.map(l => l.data),
						salaries: salaries.map(s => s.data),
						subscriptions: subscriptions.map(s => s.data),
						transactions: transactions.map(t => t.data),
					}),
					method: "POST",
				});

				// Update local with server data
				await Promise.all([
					localAccounts.clear().then(() =>
						localAccounts.bulkPut(
							response.serverData.accounts.map(a => ({
								data: a,
								localId: a.id,
								syncedAt: Date.now(),
							})),
						),
					),
					localCategories.clear().then(() =>
						localCategories.bulkPut(
							response.serverData.categories.map(c => ({
								data: c,
								localId: c.id,
								syncedAt: Date.now(),
							})),
						),
					),
					localTransactions.clear().then(() =>
						localTransactions.bulkPut(
							response.serverData.transactions.map(t => ({
								data: t,
								localId: t.id,
								syncedAt: Date.now(),
							})),
						),
					),
					localLoans.clear().then(() =>
						localLoans.bulkPut(
							response.serverData.loans.map(l => ({
								data: l,
								localId: l.id,
								syncedAt: Date.now(),
							})),
						),
					),
					localDebts.clear().then(() =>
						localDebts.bulkPut(
							response.serverData.debts.map(d => ({
								data: d,
								localId: d.id,
								syncedAt: Date.now(),
							})),
						),
					),
					localSalaries.clear().then(() =>
						localSalaries.bulkPut(
							response.serverData.salaries.map(s => ({
								data: s,
								localId: s.id,
								syncedAt: Date.now(),
							})),
						),
					),
					localSubscriptions.clear().then(() =>
						localSubscriptions.bulkPut(
							response.serverData.subscriptions.map(s => ({
								data: s,
								localId: s.id,
								syncedAt: Date.now(),
							})),
						),
					),
				]);

				// Save sync timestamp
				await localMeta.set("lastSyncAt", Date.now());

				// Collect errors
				const errors: string[] = [];
				for (const [_, result] of Object.entries(response.syncResults)) {
					errors.push(...result.errors);
				}

				return { errors, success: errors.length === 0 };
			} catch (error) {
				return {
					errors: [error instanceof Error ? error.message : "Sync failed"],
					success: false,
				};
			}
		},
	},

	// ============== TRANSACTIONS ==============
	transactions: {
		async create(data: Omit<Transaction, "id" | "createdAt">): Promise<Transaction> {
			if (isGuestMode()) {
				const newTransaction: Transaction = {
					...data,
					createdAt: new Date().toISOString(),
					id: crypto.randomUUID(),
				};
				await localTransactions.put(newTransaction, newTransaction.id);
				return newTransaction;
			}
			const transaction = await fetchWithAuth<Transaction>("/transactions", {
				body: JSON.stringify(data),
				method: "POST",
			});
			await localTransactions.put(transaction, transaction.id);
			return transaction;
		},

		async delete(id: string): Promise<void> {
			if (isGuestMode()) {
				await localTransactions.delete(id);
				return;
			}
			await fetchWithAuth(`/transactions/${id}`, { method: "DELETE" });
			await localTransactions.delete(id);
		},
		async getAll(params?: {
			startDate?: string;
			endDate?: string;
			type?: Transaction["type"];
			categoryId?: string;
			accountId?: string;
			limit?: number;
			offset?: number;
		}): Promise<Transaction[]> {
			if (isGuestMode()) {
				const local = await localTransactions.getAll();
				let transactions = local.map(item => item.data);

				// Apply filters locally
				if (params?.startDate) {
					transactions = transactions.filter(t => t.date >= params.startDate!);
				}
				if (params?.endDate) {
					transactions = transactions.filter(t => t.date <= params.endDate!);
				}
				if (params?.type) {
					transactions = transactions.filter(t => t.type === params.type);
				}
				if (params?.categoryId) {
					transactions = transactions.filter(t => t.categoryId === params.categoryId);
				}
				if (params?.accountId) {
					transactions = transactions.filter(
						t => t.originId === params.accountId || t.destinationId === params.accountId,
					);
				}

				// Sort by date descending
				transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

				// Apply pagination
				if (params?.offset) {
					transactions = transactions.slice(params.offset);
				}
				if (params?.limit) {
					transactions = transactions.slice(0, params.limit);
				}

				return transactions;
			}

			const searchParams = new URLSearchParams();
			if (params) {
				for (const [key, value] of Object.entries(params)) {
					if (value !== undefined) {
						searchParams.append(key, String(value));
					}
				}
			}
			const query = searchParams.toString();
			const url = query ? `/transactions?${query}` : "/transactions";

			const transactions = await fetchWithAuth<Transaction[]>(url);
			await localTransactions.bulkPut(
				transactions.map(t => ({ data: t, localId: t.id, syncedAt: Date.now() })),
			);
			return transactions;
		},

		async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
			if (isGuestMode()) {
				const existing = await localTransactions.getById(id);
				if (!existing) throw new Error("Transaction not found");
				const updated: Transaction = { ...existing.data, ...data };
				await localTransactions.put(updated, id);
				return updated;
			}
			const transaction = await fetchWithAuth<Transaction>(`/transactions/${id}`, {
				body: JSON.stringify(data),
				method: "PATCH",
			});
			await localTransactions.put(transaction, transaction.id);
			return transaction;
		},
	},
};
