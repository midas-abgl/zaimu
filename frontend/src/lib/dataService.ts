/**
 * Data Service - Abstracts local vs remote data operations
 *
 * When in guest mode: All operations use IndexedDB
 * When authenticated: Operations use backend API with local caching
 */

import { useAuthStore } from "@/stores/auth";
import type {
	Category,
	CreditCard,
	CreditCardStatement,
	CreditCardStatementDetail,
	CreditPurchase,
	Dashboard,
	Debt,
	FinancialAccount,
	FinancialInstitution,
	Loan,
	RecurringPayment,
	Salary,
	Subscription,
	Transaction,
} from "./api";
import { normalizeInstitutionName } from "./financial-institution";
import {
	clearAllLocalData,
	localAccounts,
	localCategories,
	localCreditCardStatements,
	localCreditCards,
	localCreditPurchases,
	localDebts,
	localLoans,
	localMeta,
	localRecurringPayments,
	localSalaries,
	localSubscriptions,
	localTransactions,
} from "./localStorage";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

type LegacySalary = Omit<Salary, "amount"> & {
	amount?: number;
	grossAmount?: number;
	netAmount?: number;
};

function normalizeSalary(salary: LegacySalary): Salary {
	const normalized = { ...salary, amount: salary.amount ?? salary.netAmount ?? 0 };
	delete normalized.grossAmount;
	delete normalized.netAmount;
	return normalized;
}

export type FinancialAccountDraft = Omit<
	FinancialAccount,
	"balance" | "createdAt" | "creditCard" | "id" | "institution" | "institutionId" | "updatedAt" | "userId"
> & {
	balance?: number;
	creditCard?: Pick<
		CreditCard,
		"creditLimit" | "dueDay" | "excludeFromTotals" | "securityDeposit" | "statementDay" | "workingDueDate"
	>;
	institutionName?: string;
};

export interface FinancialAccountUpdateDraft {
	balance?: number;
	creditCard?: FinancialAccountDraft["creditCard"];
	institutionName?: string;
	name?: string | null;
}

// Check if we're in guest mode or authenticated
function isGuestMode(): boolean {
	const state = useAuthStore.getState();
	return state.isGuestMode;
}

function getUserId(): string {
	const state = useAuthStore.getState();
	return state.user?.id || state.guestId;
}

// Generic authenticated fetch
async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${API_URL}${endpoint}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});

	if (!response.ok) {
		if (response.status === 401) {
			await useAuthStore.getState().logout();
			throw new Error("Sua sessão expirou. Entre novamente.");
		}
		if (response.status === 429)
			throw new Error("Muitas solicitações. Aguarde um instante e tente novamente.");
		const error = await response.json().catch(() => ({ error: "Erro desconhecido" }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	return response.json();
}

// ============== ACCOUNTS ==============
export const dataService = {
	accounts: {
		async create(data: FinancialAccountDraft): Promise<FinancialAccount> {
			const userId = getUserId();
			if (isGuestMode()) {
				const { creditCard, institutionName, ...accountData } = data;
				let institution: FinancialInstitution | null = null;
				const normalizedInstitutionName = normalizeInstitutionName(institutionName ?? "");
				if (normalizedInstitutionName) {
					const storedAccounts = await localAccounts.getAll();
					institution =
						storedAccounts
							.map(item => item.data.institution)
							.find(item => item && normalizeInstitutionName(item.name) === normalizedInstitutionName) ??
						null;
					institution ??= {
						id: crypto.randomUUID(),
						name: institutionName!.normalize("NFKC").trim().replace(/\s+/gu, " "),
					};
				}
				let newAccount: FinancialAccount = {
					...accountData,
					balance: data.type === "CREDIT_CARD" ? null : (accountData.balance ?? 0),
					createdAt: new Date().toISOString(),
					id: crypto.randomUUID(),
					institution,
					institutionId: institution?.id ?? null,
					updatedAt: new Date().toISOString(),
					userId,
				};
				await localAccounts.put(newAccount, newAccount.id);
				if (data.type === "CREDIT_CARD" && creditCard) {
					const card = await dataService.creditCards.createFromAccount(newAccount, creditCard);
					newAccount = { ...newAccount, creditCard: card };
					await localAccounts.put(newAccount, newAccount.id);
				}
				return newAccount;
			}
			const account = await fetchWithAuth<FinancialAccount>("/financial-accounts", {
				body: JSON.stringify(data),
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
			await fetchWithAuth(`/financial-accounts/${id}`, { method: "DELETE" });
			await localAccounts.delete(id);
		},
		async getAll(): Promise<FinancialAccount[]> {
			if (isGuestMode()) {
				const local = await localAccounts.getAll();
				return local.map(item =>
					item.data.type === "CREDIT_CARD" ? { ...item.data, balance: null } : item.data,
				);
			}
			const accounts = await fetchWithAuth<FinancialAccount[]>("/financial-accounts");
			// Cache locally
			await localAccounts.bulkPut(accounts.map(a => ({ data: a, localId: a.id, syncedAt: Date.now() })));
			return accounts;
		},

		async getById(id: string): Promise<FinancialAccount | null> {
			if (isGuestMode()) {
				const local = await localAccounts.getById(id);
				return local?.data || null;
			}
			try {
				return await fetchWithAuth<FinancialAccount>(`/financial-accounts/${id}`);
			} catch {
				// Fallback to local cache
				const local = await localAccounts.getById(id);
				return local?.data || null;
			}
		},

		async update(id: string, data: FinancialAccountUpdateDraft): Promise<FinancialAccount> {
			if (isGuestMode()) {
				const existing = await localAccounts.getById(id);
				if (!existing) throw new Error("FinancialAccount not found");
				const { institutionName, ...accountData } = data;
				let institution = existing.data.institution ?? null;
				if (institutionName !== undefined) {
					const normalizedName = normalizeInstitutionName(institutionName);
					institution = normalizedName
						? ((await localAccounts.getAll())
								.map(item => item.data.institution)
								.find(item => item && normalizeInstitutionName(item.name) === normalizedName) ?? {
								id: crypto.randomUUID(),
								name: institutionName.normalize("NFKC").trim().replace(/\s+/gu, " "),
							})
						: null;
				}
				const updated: FinancialAccount = {
					...existing.data,
					...accountData,
					creditCard:
						data.creditCard && existing.data.creditCard
							? { ...existing.data.creditCard, ...data.creditCard }
							: existing.data.creditCard,
					institution,
					institutionId: institution?.id ?? null,
					updatedAt: new Date().toISOString(),
				};
				await localAccounts.put(updated, id);
				return updated;
			}
			const account = await fetchWithAuth<FinancialAccount>(`/financial-accounts/${id}`, {
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
				body: JSON.stringify(data),
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
			const categories = await fetchWithAuth<Category[]>("/categories");
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

	creditCards: {
		async addPurchase(
			cardId: string,
			data: {
				categoryId?: string;
				description: string;
				installments?: number;
				purchaseDate: string;
				tagIds?: string[];
				totalAmount: number;
			},
		): Promise<CreditPurchase[]> {
			if (!isGuestMode()) {
				return fetchWithAuth<CreditPurchase[]>(`/credit-cards/${cardId}/purchases`, {
					body: JSON.stringify(data),
					method: "POST",
				});
			}
			const card = (await localCreditCards.getById(cardId))?.data;
			if (!card) throw new Error("Cartão não encontrado");
			const installments = Math.max(1, data.installments ?? 1);
			const installmentAmount = data.totalAmount / installments;
			const purchases: CreditPurchase[] = [];
			for (let index = 0; index < installments; index++) {
				const installmentDate = new Date(`${data.purchaseDate}T12:00:00`);
				installmentDate.setMonth(installmentDate.getMonth() + index);
				if (installmentDate.getDate() > card.statementDay)
					installmentDate.setMonth(installmentDate.getMonth() + 1);
				const statementDate = new Date(
					installmentDate.getFullYear(),
					installmentDate.getMonth(),
					card.statementDay,
				);
				const statementKey = `${cardId}:${statementDate.toISOString().slice(0, 10)}`;
				const storedStatement = await localCreditCardStatements.getById(statementKey);
				const dueDate = new Date(statementDate.getFullYear(), statementDate.getMonth(), card.dueDay);
				if (dueDate <= statementDate) dueDate.setMonth(dueDate.getMonth() + 1);
				const statement: CreditCardStatement = storedStatement?.data ?? {
					creditCardId: cardId,
					dueDate: dueDate.toISOString(),
					id: statementKey,
					isPaid: false,
					paidAmount: 0,
					statementDate: statementDate.toISOString(),
					totalAmount: 0,
				};
				statement.totalAmount += installmentAmount;
				await localCreditCardStatements.put(statement, statement.id);
				const purchase: CreditPurchase = {
					categoryId: data.tagIds?.[0] ?? data.categoryId,
					currentInstallment: index + 1,
					description: data.description,
					id: crypto.randomUUID(),
					installmentAmount,
					installments,
					parentId: purchases[0]?.id,
					purchaseDate: data.purchaseDate,
					statementId: statement.id,
					tagIds: data.tagIds,
					totalAmount: data.totalAmount,
				};
				await localCreditPurchases.put(purchase, purchase.id);
				purchases.push(purchase);
			}
			return purchases;
		},
		async createFromAccount(
			account: FinancialAccount,
			details: NonNullable<FinancialAccountDraft["creditCard"]>,
		) {
			const card: CreditCard = {
				accountName: account.name,
				creditLimit: details.creditLimit,
				dueDay: details.dueDay,
				excludeFromTotals: details.excludeFromTotals ?? false,
				financialAccountId: account.id,
				id: crypto.randomUUID(),
				securityDeposit: details.securityDeposit ?? null,
				statementDay: details.statementDay,
				workingDueDate: details.workingDueDate,
			};
			await localCreditCards.put(card, card.id);
			return card;
		},
		async deletePurchase(cardId: string, purchaseId: string): Promise<void> {
			if (!isGuestMode()) {
				await fetchWithAuth(`/credit-cards/${cardId}/purchases/${purchaseId}`, { method: "DELETE" });
				return;
			}
			const storedPurchase = await localCreditPurchases.getById(purchaseId);
			if (!storedPurchase) throw new Error("Compra não encontrada");
			const statement = (await localCreditCardStatements.getById(storedPurchase.data.statementId))?.data;
			if (!statement || statement.creditCardId !== cardId) throw new Error("Fatura não encontrada");
			if (statement.isPaid) throw new Error("Compras de faturas pagas não podem ser excluídas");
			statement.totalAmount = Math.max(0, statement.totalAmount - storedPurchase.data.installmentAmount);
			await Promise.all([
				localCreditPurchases.delete(purchaseId),
				localCreditCardStatements.put(statement, statement.id),
			]);
		},
		async getAll(): Promise<CreditCard[]> {
			if (isGuestMode()) {
				const [storedCards, storedAccounts] = await Promise.all([
					localCreditCards.getAll(),
					localAccounts.getAll(),
				]);
				const accounts = new Map(storedAccounts.map(item => [item.data.id, item.data]));
				return storedCards.map(({ data: card }) => ({
					...card,
					accountName: card.accountName || accounts.get(card.financialAccountId)?.institution?.name || null,
				}));
			}
			const cards = await fetchWithAuth<CreditCard[]>("/credit-cards");
			await localCreditCards.bulkPut(
				cards.map(card => ({ data: card, localId: card.id, syncedAt: Date.now() })),
			);
			return cards;
		},
		async getStatement(cardId: string, statementId: string): Promise<CreditCardStatementDetail> {
			if (isGuestMode()) {
				const statement = (await localCreditCardStatements.getById(statementId))?.data;
				if (!statement || statement.creditCardId !== cardId) throw new Error("Fatura não encontrada");
				const [storedPurchases, storedCategories] = await Promise.all([
					localCreditPurchases.getAll(),
					localCategories.getAll(),
				]);
				const categories = new Map(storedCategories.map(item => [item.data.id, item.data]));
				const purchases = storedPurchases
					.map(item => item.data)
					.filter(purchase => purchase.statementId === statementId)
					.map(purchase => {
						const tagIds = purchase.tagIds ?? (purchase.categoryId ? [purchase.categoryId] : []);
						const tags = tagIds.flatMap(tagId => {
							const tag = categories.get(tagId);
							return tag ? [tag] : [];
						});
						return {
							...purchase,
							categoryColor: tags[0]?.color ?? undefined,
							categoryName: tags[0]?.name,
							tags,
						};
					})
					.sort((left, right) => right.purchaseDate.localeCompare(left.purchaseDate));
				return { ...statement, purchases };
			}
			return fetchWithAuth<CreditCardStatementDetail>(`/credit-cards/${cardId}/statements/${statementId}`);
		},
		async getStatements(cardId: string, isPaid?: boolean): Promise<CreditCardStatement[]> {
			if (isGuestMode()) {
				return (await localCreditCardStatements.getAll())
					.map(item => item.data)
					.filter(
						statement =>
							statement.creditCardId === cardId && (isPaid === undefined || statement.isPaid === isPaid),
					)
					.sort((left, right) => right.statementDate.localeCompare(left.statementDate));
			}
			const suffix = isPaid === undefined ? "" : `?isPaid=${isPaid}`;
			const statements = await fetchWithAuth<CreditCardStatement[]>(
				`/credit-cards/${cardId}/statements${suffix}`,
			);
			await localCreditCardStatements.bulkPut(
				statements.map(statement => ({ data: statement, localId: statement.id, syncedAt: Date.now() })),
			);
			return statements;
		},
		async payStatement(
			cardId: string,
			statementId: string,
			data: { amount?: number; date: string; financialAccountId: string },
		): Promise<{ statement: CreditCardStatement; transaction: Transaction }> {
			if (!isGuestMode()) {
				const payment = await fetchWithAuth<{ statement: CreditCardStatement; transaction: Transaction }>(
					`/credit-cards/${cardId}/statements/${statementId}/pay`,
					{ body: JSON.stringify(data), method: "POST" },
				);
				await Promise.all([
					localCreditCardStatements.put(payment.statement, payment.statement.id),
					localTransactions.put(payment.transaction, payment.transaction.id),
				]);
				return payment;
			}

			const [storedStatement, storedCard, storedAccount] = await Promise.all([
				localCreditCardStatements.getById(statementId),
				localCreditCards.getById(cardId),
				localAccounts.getById(data.financialAccountId),
			]);
			const statement = storedStatement?.data;
			if (!statement || statement.creditCardId !== cardId) throw new Error("Fatura não encontrada");
			if (statement.isPaid) throw new Error("Esta fatura já foi paga");
			if (!storedCard) throw new Error("Cartão não encontrado");
			if (
				!storedAccount ||
				storedAccount.data.type === "CREDIT_CARD" ||
				storedAccount.data.balance === null
			) {
				throw new Error("Selecione uma conta com saldo próprio");
			}

			const remainingAmount = statement.totalAmount - statement.paidAmount;
			const amount = data.amount ?? remainingAmount;
			if (amount <= 0 || amount > remainingAmount) throw new Error("Informe um valor válido para a fatura");

			const updatedStatement: CreditCardStatement = {
				...statement,
				isPaid: statement.paidAmount + amount >= statement.totalAmount,
				paidAmount: statement.paidAmount + amount,
			};
			const transaction: Transaction = {
				amount,
				createdAt: new Date().toISOString(),
				date: data.date,
				description: `Pagamento da fatura — ${storedCard.data.accountName || "Cartão de crédito"}`,
				id: crypto.randomUUID(),
				originFinancialAccountId: data.financialAccountId,
				type: "EXPENSE",
			};
			const updatedAccount: FinancialAccount = {
				...storedAccount.data,
				balance: storedAccount.data.balance - amount,
				updatedAt: new Date().toISOString(),
			};
			await Promise.all([
				localAccounts.put(updatedAccount, updatedAccount.id),
				localCreditCardStatements.put(updatedStatement, updatedStatement.id),
				localTransactions.put(transaction, transaction.id),
			]);
			return { statement: updatedStatement, transaction };
		},
		async updatePurchase(
			cardId: string,
			purchaseId: string,
			data: {
				description: string;
				installmentAmount: number;
				purchaseDate: string;
				tagIds: string[];
			},
		): Promise<CreditPurchase> {
			if (!isGuestMode()) {
				return fetchWithAuth<CreditPurchase>(`/credit-cards/${cardId}/purchases/${purchaseId}`, {
					body: JSON.stringify(data),
					method: "PATCH",
				});
			}
			const storedPurchase = await localCreditPurchases.getById(purchaseId);
			if (!storedPurchase) throw new Error("Compra não encontrada");
			const statement = (await localCreditCardStatements.getById(storedPurchase.data.statementId))?.data;
			if (!statement || statement.creditCardId !== cardId) throw new Error("Fatura não encontrada");
			if (statement.isPaid) throw new Error("Compras de faturas pagas não podem ser editadas");
			const updatedPurchase: CreditPurchase = {
				...storedPurchase.data,
				categoryId: data.tagIds[0],
				description: data.description,
				installmentAmount: data.installmentAmount,
				purchaseDate: data.purchaseDate,
				tagIds: data.tagIds,
				...(storedPurchase.data.installments === 1 && { totalAmount: data.installmentAmount }),
			};
			statement.totalAmount += data.installmentAmount - storedPurchase.data.installmentAmount;
			await Promise.all([
				localCreditPurchases.put(updatedPurchase, purchaseId),
				localCreditCardStatements.put(statement, statement.id),
			]);
			return updatedPurchase;
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

				const totalBalance = accounts
					.filter(account => account.type !== "CREDIT_CARD")
					.reduce((sum, account) => sum + (account.balance ?? 0), 0);
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

			return fetchWithAuth<Dashboard>("/dashboard");
		},
	},

	// ============== DEBTS ==============
	debts: {
		async create(
			data: Omit<Debt, "id" | "isPaid" | "paidDate" | "userId"> & { isPaid?: boolean; paidDate?: string },
		): Promise<Debt> {
			const userId = getUserId();
			if (isGuestMode()) {
				const newDebt: Debt = {
					...data,
					id: crypto.randomUUID(),
					isPaid: data.isPaid ?? false,
					userId,
				};
				await localDebts.put(newDebt, newDebt.id);
				return newDebt;
			}
			const debt = await fetchWithAuth<Debt>("/debts", {
				body: JSON.stringify(data),
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
			const response = await fetchWithAuth<{ debts: Debt[] }>("/debts");
			const debts = response.debts;
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
	financialInstitutions: {
		async update(id: string, name: string): Promise<FinancialInstitution> {
			if (isGuestMode()) {
				const accounts = await localAccounts.getAll();
				const institution = accounts.find(item => item.data.institutionId === id)?.data.institution;
				if (!institution) throw new Error("Instituição financeira não encontrada");
				const updated = { ...institution, name: name.normalize("NFKC").trim().replace(/\s+/gu, " ") };
				await Promise.all(
					accounts
						.filter(item => item.data.institutionId === id)
						.map(item =>
							localAccounts.put(
								{ ...item.data, institution: updated, updatedAt: new Date().toISOString() },
								item.localId,
							),
						),
				);
				return updated;
			}
			return fetchWithAuth<FinancialInstitution>(`/financial-institutions/${id}`, {
				body: JSON.stringify({ name }),
				method: "PATCH",
			});
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
				body: JSON.stringify(data),
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
			const loans = await fetchWithAuth<Loan[]>("/loans");
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

	recurringPayments: {
		async create(
			data: Omit<
				RecurringPayment,
				"createdAt" | "id" | "isActive" | "paymentMethod" | "updatedAt" | "userId"
			> & { isActive?: boolean; paymentMethod?: RecurringPayment["paymentMethod"] },
		): Promise<RecurringPayment> {
			const userId = getUserId();
			if (isGuestMode()) {
				const payment: RecurringPayment = {
					...data,
					createdAt: new Date().toISOString(),
					id: crypto.randomUUID(),
					isActive: data.isActive ?? true,
					paymentMethod: data.paymentMethod ?? "DEBIT",
					updatedAt: new Date().toISOString(),
					userId,
				};
				await localRecurringPayments.put(payment, payment.id);
				return payment;
			}
			return fetchWithAuth<RecurringPayment>("/recurring", { body: JSON.stringify(data), method: "POST" });
		},
		async delete(id: string) {
			if (isGuestMode()) return localRecurringPayments.delete(id);
			await fetchWithAuth(`/recurring/${id}`, { method: "DELETE" });
		},
		async getAll(): Promise<RecurringPayment[]> {
			if (isGuestMode()) return (await localRecurringPayments.getAll()).map(item => item.data);
			const payments = await fetchWithAuth<RecurringPayment[]>("/recurring");
			await localRecurringPayments.bulkPut(
				payments.map(payment => ({ data: payment, localId: payment.id, syncedAt: Date.now() })),
			);
			return payments;
		},
		async update(id: string, changes: Partial<RecurringPayment>): Promise<RecurringPayment> {
			if (isGuestMode()) {
				const existing = await localRecurringPayments.getById(id);
				if (!existing) throw new Error("Recorrência não encontrada");
				const payment = { ...existing.data, ...changes, updatedAt: new Date().toISOString() };
				await localRecurringPayments.put(payment, id);
				return payment;
			}
			return fetchWithAuth<RecurringPayment>(`/recurring/${id}`, {
				body: JSON.stringify(changes),
				method: "PATCH",
			});
		},
	},

	// ============== SALARIES ==============
	salaries: {
		async create(data: {
			amount: number;
			financialAccountId: string;
			frequency: Salary["frequency"];
			isActive?: boolean;
			payDay: number;
			source: string;
			startDate: string;
		}): Promise<Salary> {
			const userId = getUserId();
			if (isGuestMode()) {
				const { amount, ...salaryData } = data;
				const newSalary: Salary = {
					...salaryData,
					amount,
					id: crypto.randomUUID(),
					isActive: data.isActive ?? true,
					userId,
				};
				await localSalaries.put(newSalary, newSalary.id);
				return newSalary;
			}
			const salary = await fetchWithAuth<Salary>("/salaries", {
				body: JSON.stringify(data),
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
				return local.map(item => normalizeSalary(item.data as LegacySalary));
			}
			const salaries = (await fetchWithAuth<Salary[]>("/salaries")).map(normalizeSalary);
			await localSalaries.bulkPut(salaries.map(s => ({ data: s, localId: s.id, syncedAt: Date.now() })));
			return salaries;
		},

		async recordPayment(
			salaryId: string,
			data: { amount: number; date: string; financialAccountId: string },
		) {
			if (isGuestMode()) {
				const account = await localAccounts.getById(data.financialAccountId);
				if (!account) throw new Error("Conta financeira não encontrada");
				await localAccounts.put(
					{ ...account.data, balance: (account.data.balance ?? 0) + data.amount },
					data.financialAccountId,
				);
				return;
			}
			await fetchWithAuth(`/salaries/${salaryId}/payments`, { body: JSON.stringify(data), method: "POST" });
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
		async create(
			data: Omit<Subscription, "id" | "isActive" | "userId"> & { isActive?: boolean },
		): Promise<Subscription> {
			const userId = getUserId();
			if (isGuestMode()) {
				const newSubscription: Subscription = {
					...data,
					id: crypto.randomUUID(),
					isActive: data.isActive ?? true,
					userId,
				};
				await localSubscriptions.put(newSubscription, newSubscription.id);
				return newSubscription;
			}
			const subscription = await fetchWithAuth<Subscription>("/subscriptions", {
				body: JSON.stringify(data),
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
			const response = await fetchWithAuth<{ subscriptions: Subscription[] }>("/subscriptions");
			const subscriptions = response.subscriptions;
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
			if (!state.isAuthenticated) {
				return { errors: ["Usuário não autenticado"], success: false };
			}

			try {
				// Get all local data
				const [
					accounts,
					categories,
					creditCards,
					creditCardStatements,
					creditPurchases,
					recurringPayments,
					transactions,
					loans,
					debts,
					salaries,
					subscriptions,
				] = await Promise.all([
					localAccounts.getAll(),
					localCategories.getAll(),
					localCreditCards.getAll(),
					localCreditCardStatements.getAll(),
					localCreditPurchases.getAll(),
					localRecurringPayments.getAll(),
					localTransactions.getAll(),
					localLoans.getAll(),
					localDebts.getAll(),
					localSalaries.getAll(),
					localSubscriptions.getAll(),
				]);

				// Send to server
				const response = await fetchWithAuth<{
					syncResults: Record<string, { synced: number; errors: string[] }>;
					serverData: {
						financialAccounts: FinancialAccount[];
						categories: Category[];
						creditCards: CreditCard[];
						creditCardStatements: CreditCardStatement[];
						creditPurchases: CreditPurchase[];
						recurringPayments: RecurringPayment[];
						transactions: Transaction[];
						loans: Loan[];
						debts: Debt[];
						salaries: Salary[];
						subscriptions: Subscription[];
					};
				}>("/sync", {
					body: JSON.stringify({
						categories: categories.map(c => c.data),
						creditCardStatements: creditCardStatements.map(statement => statement.data),
						creditCards: creditCards.map(card => card.data),
						creditPurchases: creditPurchases.map(purchase => purchase.data),
						debts: debts.map(d => d.data),
						financialAccounts: accounts.map(a => a.data),
						loans: loans.map(l => l.data),
						recurringPayments: recurringPayments.map(payment => payment.data),
						salaries: salaries.map(s => normalizeSalary(s.data as LegacySalary)),
						subscriptions: subscriptions.map(s => s.data),
						transactions: transactions.map(t => t.data),
					}),
					method: "POST",
				});

				// Update local with server data
				await Promise.all([
					localAccounts.clear().then(() =>
						localAccounts.bulkPut(
							response.serverData.financialAccounts.map(a => ({
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
					localCreditCards.clear().then(() =>
						localCreditCards.bulkPut(
							response.serverData.creditCards.map(card => ({
								data: card,
								localId: card.id,
								syncedAt: Date.now(),
							})),
						),
					),
					localCreditCardStatements.clear().then(() =>
						localCreditCardStatements.bulkPut(
							response.serverData.creditCardStatements.map(statement => ({
								data: statement,
								localId: statement.id,
								syncedAt: Date.now(),
							})),
						),
					),
					localCreditPurchases.clear().then(() =>
						localCreditPurchases.bulkPut(
							response.serverData.creditPurchases.map(purchase => ({
								data: purchase,
								localId: purchase.id,
								syncedAt: Date.now(),
							})),
						),
					),
					localRecurringPayments.clear().then(() =>
						localRecurringPayments.bulkPut(
							response.serverData.recurringPayments.map(payment => ({
								data: payment,
								localId: payment.id,
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
					errors: [error instanceof Error ? error.message : "Falha na sincronização"],
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
			financialAccountId?: string;
			limit?: number;
			offset?: number;
		}): Promise<Transaction[]> {
			if (isGuestMode()) {
				const [local, storedPurchases, storedStatements, storedCards, storedCategories, storedAccounts] =
					await Promise.all([
						localTransactions.getAll(),
						localCreditPurchases.getAll(),
						localCreditCardStatements.getAll(),
						localCreditCards.getAll(),
						localCategories.getAll(),
						localAccounts.getAll(),
					]);
				const statements = new Map(storedStatements.map(item => [item.data.id, item.data]));
				const cards = new Map(storedCards.map(item => [item.data.id, item.data]));
				const categories = new Map(storedCategories.map(item => [item.data.id, item.data]));
				const accounts = new Map(storedAccounts.map(item => [item.data.id, item.data]));
				const purchases: Transaction[] = storedPurchases
					.map(item => item.data)
					.filter(purchase => purchase.currentInstallment === 1)
					.flatMap(purchase => {
						const statement = statements.get(purchase.statementId);
						const card = statement ? cards.get(statement.creditCardId) : undefined;
						if (!card) return [];
						const tagIds = purchase.tagIds ?? (purchase.categoryId ? [purchase.categoryId] : []);
						const tags = tagIds.flatMap(tagId => {
							const tag = categories.get(tagId);
							return tag ? [tag] : [];
						});
						return [
							{
								amount: purchase.totalAmount,
								categoryColor: tags[0]?.color ?? undefined,
								categoryId: purchase.categoryId,
								categoryName: tags[0]?.name,
								createdAt: purchase.purchaseDate,
								date: purchase.purchaseDate,
								description: purchase.description,
								id: purchase.id,
								originFinancialAccountId: card.financialAccountId,
								originName:
									card.accountName ||
									accounts.get(card.financialAccountId)?.name ||
									accounts.get(card.financialAccountId)?.institution?.name ||
									"Cartão de crédito",
								source: "CREDIT_CARD" as const,
								sourceName:
									card.accountName ||
									accounts.get(card.financialAccountId)?.institution?.name ||
									"Cartão de crédito",
								tagIds,
								tags,
								type: "EXPENSE" as const,
							},
						];
					});
				let transactions = [
					...local.map(item => {
						const originAccount = item.data.originFinancialAccountId
							? accounts.get(item.data.originFinancialAccountId)
							: undefined;
						const destinationAccount = item.data.destinationFinancialAccountId
							? accounts.get(item.data.destinationFinancialAccountId)
							: undefined;
						const originName = originAccount?.name || originAccount?.institution?.name;
						const destinationName = destinationAccount?.name || destinationAccount?.institution?.name;

						return {
							...item.data,
							destinationName,
							originName,
							source: "FINANCIAL_ACCOUNT" as const,
							sourceName: item.data.type === "INCOME" ? destinationName : originName,
						};
					}),
					...purchases,
				];

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
					transactions = transactions.filter(t =>
						(t.tagIds ?? (t.categoryId ? [t.categoryId] : [])).includes(params.categoryId!),
					);
				}
				if (params?.financialAccountId) {
					transactions = transactions.filter(
						t =>
							t.originFinancialAccountId === params.financialAccountId ||
							t.destinationFinancialAccountId === params.financialAccountId,
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
				transactions
					.filter(transaction => transaction.source !== "CREDIT_CARD")
					.map(t => ({ data: t, localId: t.id, syncedAt: Date.now() })),
			);
			return transactions;
		},

		async update(id: string, data: Partial<Transaction>): Promise<Transaction> {
			if (isGuestMode()) {
				const existing = await localTransactions.getById(id);
				if (!existing) throw new Error("Transação não encontrada");
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
