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
	DebtInvitation,
	DebtLedger,
	DebtPerson,
	FinancialAccount,
	FinancialInstitution,
	Loan,
	RecurringPayment,
	Salary,
	Store,
	Subscription,
	Transaction,
} from "./api";
import { getCurrentLocalTime } from "./date";
import { calculateFinancialAccountBalances } from "./financial-account";
import { normalizeInstitutionName } from "./financial-institution";
import {
	clearAllLocalData,
	localAccounts,
	localCategories,
	localCreditCardStatements,
	localCreditCards,
	localCreditPurchases,
	localDebtPeople,
	localDebts,
	localLoans,
	localMeta,
	localRecurringPayments,
	localSalaries,
	localStores,
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
	| "balance"
	| "createdAt"
	| "creditCard"
	| "id"
	| "institution"
	| "institutionId"
	| "rewardsAccount"
	| "updatedAt"
	| "userId"
> & {
	creditCard?: Pick<
		CreditCard,
		| "cashbackAccountId"
		| "cashbackRate"
		| "cashbackYieldPeriod"
		| "cashbackYieldRate"
		| "creditLimit"
		| "dueDay"
		| "excludeFromTotals"
		| "securityDeposit"
		| "statementDay"
		| "workingDueDate"
	> & {
		cashbackRewards?: {
			conversionAmount?: number;
			conversionPoints?: number;
			kind: "CASHBACK" | "POINTS";
		};
	};
	institutionName?: string;
	rewardsAccount?: Pick<
		NonNullable<FinancialAccount["rewardsAccount"]>,
		"conversionAmount" | "conversionPoints" | "initialBalance" | "kind"
	>;
};

export interface FinancialAccountUpdateDraft {
	creditCard?: FinancialAccountDraft["creditCard"];
	institutionName?: string;
	name?: string | null;
	rewardsAccount?: FinancialAccountDraft["rewardsAccount"];
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
				const { creditCard, institutionName, rewardsAccount, ...accountData } = data;
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
					balance: data.type === "CREDIT_CARD" ? null : 0,
					createdAt: new Date().toISOString(),
					id: crypto.randomUUID(),
					institution,
					institutionId: institution?.id ?? null,
					updatedAt: new Date().toISOString(),
					userId,
				};
				if (data.type === "REWARDS" && rewardsAccount) {
					newAccount = {
						...newAccount,
						rewardsAccount: {
							...rewardsAccount,
							conversionAmount: rewardsAccount.conversionAmount ?? null,
							conversionPoints: rewardsAccount.conversionPoints ?? null,
							financialAccountId: newAccount.id,
							id: crypto.randomUUID(),
						},
					};
				}
				await localAccounts.put(newAccount, newAccount.id);
				if (data.type === "CREDIT_CARD" && creditCard) {
					if (creditCard.cashbackRate && !creditCard.cashbackAccountId && creditCard.cashbackRewards) {
						const matchingReward = (await localAccounts.getAll())
							.map(item => item.data)
							.find(
								item =>
									item.type === "REWARDS" &&
									item.institutionId === newAccount.institutionId &&
									item.name === null,
							);
						if (matchingReward) creditCard.cashbackAccountId = matchingReward.id;
						else {
							const rewardAccount: FinancialAccount = {
								balance: 0,
								createdAt: new Date().toISOString(),
								id: crypto.randomUUID(),
								institution: newAccount.institution,
								institutionId: newAccount.institutionId,
								name: null,
								rewardsAccount: {
									...creditCard.cashbackRewards,
									conversionAmount: creditCard.cashbackRewards.conversionAmount ?? null,
									conversionPoints: creditCard.cashbackRewards.conversionPoints ?? null,
									financialAccountId: "",
									id: crypto.randomUUID(),
									initialBalance: 0,
								},
								type: "REWARDS",
								updatedAt: new Date().toISOString(),
								userId,
							};
							rewardAccount.rewardsAccount!.financialAccountId = rewardAccount.id;
							await localAccounts.put(rewardAccount, rewardAccount.id);
							creditCard.cashbackAccountId = rewardAccount.id;
						}
					}
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
				const [local, transactions, cashbackPurchases] = await Promise.all([
					localAccounts.getAll(),
					localTransactions.getAll(),
					localCreditPurchases.getAll(),
				]);
				return calculateFinancialAccountBalances(
					local.map(item => item.data),
					transactions.map(item => item.data),
					cashbackPurchases.map(item => item.data),
				);
			}
			const accounts = await fetchWithAuth<FinancialAccount[]>("/financial-accounts");
			// Cache locally
			await localAccounts.bulkPut(accounts.map(a => ({ data: a, localId: a.id, syncedAt: Date.now() })));
			return accounts;
		},

		async getById(id: string): Promise<FinancialAccount | null> {
			if (isGuestMode()) {
				return (await this.getAll()).find(account => account.id === id) ?? null;
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
					rewardsAccount:
						data.rewardsAccount && existing.data.rewardsAccount
							? { ...existing.data.rewardsAccount, ...data.rewardsAccount }
							: existing.data.rewardsAccount,
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
				debtPersonId?: string;
				description?: string;
				storeName?: string;
				installments?: number;
				matchDebtEventId?: string;
				purchaseDate: string;
				subscriptionId?: string;
				subscriptionOccurrenceDate?: string;
				time?: string | null;
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
			if ((data.subscriptionId === undefined) !== (data.subscriptionOccurrenceDate === undefined)) {
				throw new Error("Informe a assinatura e a data da ocorrência juntas");
			}
			if (data.subscriptionId && data.subscriptionOccurrenceDate) {
				const existing = (await localCreditPurchases.getAll()).find(
					item =>
						item.data.subscriptionId === data.subscriptionId &&
						item.data.subscriptionOccurrenceDate === data.subscriptionOccurrenceDate,
				);
				if (existing) return [existing.data];
			}
			const installments = Math.max(1, data.installments ?? 1);
			const installmentAmount = data.totalAmount / installments;
			const cashbackAmount =
				card.cashbackAccountId && card.cashbackRate
					? Number(((data.totalAmount * card.cashbackRate) / 100).toFixed(4))
					: undefined;
			const purchaseDate = new Date(`${data.purchaseDate}T12:00:00`);
			if (purchaseDate.getDate() > card.statementDay) purchaseDate.setMonth(purchaseDate.getMonth() + 1);
			const statementDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), card.statementDay);
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
			const purchase: CreditPurchase = {
				cashbackAccountId: cashbackAmount ? card.cashbackAccountId : undefined,
				cashbackAmount,
				cashbackYieldPeriod: cashbackAmount ? card.cashbackYieldPeriod : undefined,
				cashbackYieldRate: cashbackAmount ? card.cashbackYieldRate : undefined,
				categoryId: data.tagIds?.[0] ?? data.categoryId,
				currentInstallment: 1,
				debtPersonId: data.debtPersonId,
				description: data.description ?? "",
				id: crypto.randomUUID(),
				installmentAmount,
				installments,
				purchaseDate: data.purchaseDate,
				statementId: statement.id,
				storeName: data.storeName,
				subscriptionId: data.subscriptionId,
				subscriptionOccurrenceDate: data.subscriptionOccurrenceDate,
				tagIds: data.tagIds,
				time: data.time === undefined ? getCurrentLocalTime() : data.time,
				totalAmount: data.totalAmount,
			};
			await Promise.all([
				localCreditCardStatements.put(statement, statement.id),
				localCreditPurchases.put(purchase, purchase.id),
			]);
			return [purchase];
		},
		async createFromAccount(
			account: FinancialAccount,
			details: NonNullable<FinancialAccountDraft["creditCard"]>,
		) {
			const card: CreditCard = {
				accountName: account.name,
				cashbackAccountId: details.cashbackAccountId ?? null,
				cashbackRate: details.cashbackRate ?? null,
				cashbackYieldPeriod: details.cashbackYieldPeriod ?? null,
				cashbackYieldRate: details.cashbackYieldRate ?? null,
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
			data: { amount?: number; date: string; financialAccountId: string; time?: string | null },
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
				storedAccount.data.type === "REWARDS" ||
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
				time: data.time === undefined ? getCurrentLocalTime() : data.time,
				type: "EXPENSE",
			};
			await Promise.all([
				localCreditCardStatements.put(updatedStatement, updatedStatement.id),
				localTransactions.put(transaction, transaction.id),
			]);
			return { statement: updatedStatement, transaction };
		},
		async refinancePurchase(
			cardId: string,
			purchaseId: string,
			data: { feeAmount: number; installments: number; purchaseDate: string },
		): Promise<{ purchases: CreditPurchase[]; settledAmount: number; totalAmount: number }> {
			if (isGuestMode())
				throw new Error("Parcelamento de compra ainda não está disponível no modo visitante");
			return fetchWithAuth(`/credit-cards/${cardId}/purchases/${purchaseId}/refinance`, {
				body: JSON.stringify(data),
				method: "POST",
			});
		},
		async updatePurchase(
			cardId: string,
			purchaseId: string,
			data: {
				creditCardId?: string;
				debtPersonId?: null | string;
				description: string;
				installments: number;
				storeName?: string | null;
				purchaseDate: string;
				time?: string | null;
				tagIds: string[];
				totalAmount: number;
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
			const targetCardId = data.creditCardId ?? cardId;
			const targetCard = (await localCreditCards.getById(targetCardId))?.data;
			if (!targetCard) throw new Error("Cartão não encontrado");
			const installments = Math.max(1, data.installments);
			const installmentAmount = data.totalAmount / installments;
			const cashback = storedPurchase.data.parentId
				? {}
				: targetCardId !== cardId
					? targetCard.cashbackAccountId && targetCard.cashbackRate
						? {
								cashbackAccountId: targetCard.cashbackAccountId,
								cashbackAmount: Number(((data.totalAmount * targetCard.cashbackRate) / 100).toFixed(4)),
								cashbackYieldPeriod: targetCard.cashbackYieldPeriod,
								cashbackYieldRate: targetCard.cashbackYieldRate,
							}
						: {
								cashbackAccountId: null,
								cashbackAmount: null,
								cashbackYieldPeriod: null,
								cashbackYieldRate: null,
							}
					: {
							cashbackAmount: storedPurchase.data.cashbackAmount
								? Number(
										(
											(storedPurchase.data.cashbackAmount * data.totalAmount) /
											storedPurchase.data.totalAmount
										).toFixed(4),
									)
								: storedPurchase.data.cashbackAmount,
						};
			const purchaseDate = new Date(`${data.purchaseDate}T12:00:00`);
			const statementMonth = new Date(purchaseDate);
			if (purchaseDate.getDate() > targetCard.statementDay)
				statementMonth.setMonth(statementMonth.getMonth() + 1);
			const targetStatementDate = new Date(
				statementMonth.getFullYear(),
				statementMonth.getMonth(),
				targetCard.statementDay,
			);
			const targetStatementId = `${targetCardId}:${targetStatementDate.toISOString().slice(0, 10)}`;
			const storedTargetStatement = await localCreditCardStatements.getById(targetStatementId);
			const targetDueDate = new Date(
				targetStatementDate.getFullYear(),
				targetStatementDate.getMonth(),
				targetCard.dueDay,
			);
			if (targetDueDate <= targetStatementDate) targetDueDate.setMonth(targetDueDate.getMonth() + 1);
			const targetStatement: CreditCardStatement = storedTargetStatement?.data ?? {
				creditCardId: targetCardId,
				dueDate: targetDueDate.toISOString(),
				id: targetStatementId,
				isPaid: false,
				paidAmount: 0,
				statementDate: targetStatementDate.toISOString(),
				totalAmount: 0,
			};
			if (targetStatement.isPaid && targetStatement.id !== statement.id)
				throw new Error("Não é possível mover uma compra para uma fatura paga");
			const updatedPurchase: CreditPurchase = {
				...storedPurchase.data,
				...cashback,
				categoryId: data.tagIds[0],
				description: data.description,
				...(data.debtPersonId !== undefined && { debtPersonId: data.debtPersonId ?? undefined }),
				...(data.storeName !== undefined && { storeName: data.storeName }),
				installmentAmount,
				installments,
				purchaseDate: data.purchaseDate,
				statementId: targetStatement.id,
				tagIds: data.tagIds,
				...(data.time !== undefined && { time: data.time }),
				totalAmount: data.totalAmount,
			};
			const changedStatement = statement.id !== targetStatement.id;
			if (changedStatement) {
				statement.totalAmount = Math.max(0, statement.totalAmount - storedPurchase.data.installmentAmount);
				targetStatement.totalAmount += installmentAmount;
			} else {
				statement.totalAmount += installmentAmount - storedPurchase.data.installmentAmount;
			}
			await Promise.all([
				localCreditPurchases.put(updatedPurchase, purchaseId),
				localCreditCardStatements.put(statement, statement.id),
				...(changedStatement ? [localCreditCardStatements.put(targetStatement, targetStatement.id)] : []),
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
					.filter(account => account.type !== "CREDIT_CARD" && account.type !== "REWARDS")
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
		async acceptInvitation(id: string, personId?: string): Promise<void> {
			if (isGuestMode()) throw new Error("Conecte sua conta para aceitar convites.");
			await fetchWithAuth(`/debts/invitations/${id}/accept`, {
				body: JSON.stringify({ personId }),
				method: "POST",
			});
		},
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
		async createOrigin(data: {
			amount: number;
			date: string;
			description?: string;
			dueDate?: string;
			isOwedToMe: boolean;
			personId: string;
		}): Promise<void> {
			if (isGuestMode()) {
				const person = await localDebtPeople.getById(data.personId);
				if (!person) throw new Error("Pessoa não encontrada");
				const debt: Debt = {
					amount: data.amount,
					date: data.date,
					description: data.description,
					dueDate: data.dueDate,
					id: crypto.randomUUID(),
					isOwedToMe: data.isOwedToMe,
					isPaid: false,
					personId: person.data.id,
					personName: person.data.name,
					userId: getUserId(),
				};
				await localDebts.put(debt, debt.id);
				return;
			}
			await fetchWithAuth("/debts/events", { body: JSON.stringify(data), method: "POST" });
		},
		async createPerson(name: string): Promise<DebtPerson> {
			if (isGuestMode()) {
				const normalizedName = name.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
				const existing = (await localDebtPeople.getAll()).find(
					item => item.data.name.toLocaleLowerCase("pt-BR") === normalizedName,
				);
				if (existing) return existing.data;
				const person: DebtPerson = {
					balance: 0,
					connectionStatus: null,
					events: [],
					id: crypto.randomUUID(),
					isZaimuUser: false,
					name: name.trim().replace(/\s+/g, " "),
				};
				await localDebtPeople.put(person, person.id);
				return person;
			}
			return fetchWithAuth<DebtPerson>("/debts/people", {
				body: JSON.stringify({ name }),
				method: "POST",
			});
		},
		async declineInvitation(id: string): Promise<void> {
			if (isGuestMode()) throw new Error("Conecte sua conta para recusar convites.");
			await fetchWithAuth(`/debts/invitations/${id}/decline`, { method: "POST" });
		},

		async delete(id: string): Promise<void> {
			if (isGuestMode()) {
				await localDebts.delete(id);
				return;
			}
			await fetchWithAuth(`/debts/${id}`, { method: "DELETE" });
			await localDebts.delete(id);
		},
		async deleteEvent(id: string): Promise<void> {
			if (isGuestMode()) {
				if (id.startsWith("transaction:") || id.startsWith("purchase:"))
					throw new Error("Exclua a movimentação financeira original.");
				await localDebts.delete(id);
				return;
			}
			await fetchWithAuth(`/debts/events/${id}`, { method: "DELETE" });
		},
		async deletePerson(id: string): Promise<void> {
			if (isGuestMode()) {
				await localDebtPeople.delete(id);
				return;
			}
			await fetchWithAuth(`/debts/people/${id}`, { method: "DELETE" });
		},
		async getAll(): Promise<Debt[]> {
			if (isGuestMode()) {
				const local = await localDebts.getAll();
				return local.map(item => item.data);
			}
			return [];
		},
		async getInvitations(): Promise<DebtInvitation[]> {
			if (isGuestMode()) return [];
			return fetchWithAuth<DebtInvitation[]>("/debts/invitations");
		},
		async getLedger(): Promise<DebtLedger> {
			if (!isGuestMode()) {
				const ledger = await fetchWithAuth<DebtLedger>("/debts");
				await localDebtPeople.bulkPut(
					ledger.people.map(person => ({ data: person, localId: person.id, syncedAt: Date.now() })),
				);
				return ledger;
			}
			const [storedPeople, storedDebts, storedTransactions, storedPurchases] = await Promise.all([
				localDebtPeople.getAll(),
				localDebts.getAll(),
				localTransactions.getAll(),
				localCreditPurchases.getAll(),
			]);
			const people = new Map<string, DebtPerson>(
				storedPeople.map(item => [item.data.id, { ...item.data, balance: 0, events: [] }]),
			);
			for (const debtItem of storedDebts) {
				const debt = debtItem.data;
				let person = debt.personId ? people.get(debt.personId) : undefined;
				if (!person) {
					person = [...people.values()].find(
						item => item.name.localeCompare(debt.personName, "pt-BR", { sensitivity: "base" }) === 0,
					);
				}
				if (!person) {
					person = {
						balance: 0,
						connectionStatus: null,
						events: [],
						id: debt.personId ?? `legacy:${debt.personName.toLocaleLowerCase("pt-BR")}`,
						isZaimuUser: false,
						name: debt.personName,
					};
					people.set(person.id, person);
				}
				const effect = Number(debt.amount) * (debt.isOwedToMe ? 1 : -1);
				person.events.push({
					amount: Number(debt.amount),
					createdByMe: true,
					createdByName: "Você",
					createdByUserId: getUserId(),
					date: debt.date,
					description: debt.description,
					dueDate: debt.dueDate,
					effect,
					id: debt.id,
					kind: "ORIGIN",
				});
				if (!debt.isPaid) person.balance += effect;
			}
			for (const item of storedTransactions) {
				const transaction = item.data;
				if (!transaction.debtPersonId || transaction.type === "TRANSFER") continue;
				const person = people.get(transaction.debtPersonId);
				if (!person) continue;
				const effect =
					transaction.type === "INCOME" ? -Number(transaction.amount) : Number(transaction.amount);
				person.balance += effect;
				person.events.push({
					amount: Number(transaction.amount),
					createdByMe: true,
					createdByName: "Você",
					createdByUserId: getUserId(),
					date: transaction.date,
					description: transaction.description,
					effect,
					id: `transaction:${transaction.id}`,
					kind: "TRANSACTION",
				});
			}
			for (const item of storedPurchases) {
				const purchase = item.data;
				if (!purchase.debtPersonId || purchase.currentInstallment !== 1) continue;
				const person = people.get(purchase.debtPersonId);
				if (!person) continue;
				const effect = Number(purchase.totalAmount);
				person.balance += effect;
				person.events.push({
					amount: effect,
					createdByMe: true,
					createdByName: "Você",
					createdByUserId: getUserId(),
					date: purchase.purchaseDate,
					description: purchase.description,
					effect,
					id: `purchase:${purchase.id}`,
					kind: "PURCHASE",
				});
			}
			const result = [...people.values()].map(person => ({
				...person,
				events: person.events.toSorted((left, right) => right.date.localeCompare(left.date)),
			}));
			return {
				people: result,
				totals: result.reduce(
					(totals, person) => {
						if (person.balance > 0) totals.owedToMe += person.balance;
						if (person.balance < 0) totals.iOwe += Math.abs(person.balance);
						totals.net += person.balance;
						return totals;
					},
					{ iOwe: 0, net: 0, owedToMe: 0 },
				),
			};
		},
		async invitePerson(id: string, email: string): Promise<void> {
			if (isGuestMode()) throw new Error("Conecte sua conta para associar usuários Zaimu.");
			await fetchWithAuth(`/debts/people/${id}/invite`, {
				body: JSON.stringify({ email }),
				method: "POST",
			});
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
		async updateOrigin(
			id: string,
			data: {
				amount: number;
				date: string;
				description?: string;
				dueDate?: string;
				isOwedToMe: boolean;
				personId: string;
			},
		): Promise<void> {
			if (isGuestMode()) {
				const person = await localDebtPeople.getById(data.personId);
				const debt = await localDebts.getById(id);
				if (!person || !debt) throw new Error("Origem não encontrada");
				await localDebts.put(
					{
						...debt.data,
						...data,
						personId: person.data.id,
						personName: person.data.name,
					},
					id,
				);
				return;
			}
			await fetchWithAuth(`/debts/events/${id}`, { body: JSON.stringify(data), method: "PATCH" });
		},
	},
	financialInstitutions: {
		async delete(id: string): Promise<void> {
			if (isGuestMode()) {
				const accounts = await localAccounts.getAll();
				await Promise.all(
					accounts
						.filter(item => item.data.institutionId === id)
						.map(item =>
							localAccounts.put(
								{ ...item.data, institution: null, institutionId: null, updatedAt: new Date().toISOString() },
								item.localId,
							),
						),
				);
				return;
			}
			await fetchWithAuth(`/financial-institutions/${id}`, { method: "DELETE" });
		},
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
		async delete(id: string, deleteTransactions = false) {
			if (isGuestMode()) {
				if (deleteTransactions) {
					const transactions = await localTransactions.getAll();
					await Promise.all(
						transactions
							.filter(transaction => transaction.data.recurrenceId === id)
							.map(transaction => localTransactions.delete(transaction.localId)),
					);
				}
				return localRecurringPayments.delete(id);
			}
			await fetchWithAuth(`/recurring/${id}?deleteTransactions=${deleteTransactions}`, { method: "DELETE" });
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
				const hasTagChanges = changes.tagIds !== undefined || changes.categoryId !== undefined;
				const tagIds = changes.tagIds ?? (changes.categoryId ? [changes.categoryId] : []);
				const payment = {
					...existing.data,
					...changes,
					...(hasTagChanges && { categoryId: tagIds[0], tagIds }),
					updatedAt: new Date().toISOString(),
				};
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
			endDate?: string;
			financialAccountId: string;
			frequency: Salary["frequency"];
			autoGenerateFrom: string;
			isActive?: boolean;
			payDay: number;
			source: string;
			startDate: string;
			tagIds?: string[];
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

		async delete(id: string, deleteTransactions = false): Promise<void> {
			if (isGuestMode()) {
				if (deleteTransactions) {
					const transactions = await localTransactions.getAll();
					await Promise.all(
						transactions
							.filter(transaction => transaction.data.salaryId === id)
							.map(transaction => localTransactions.delete(transaction.localId)),
					);
				}
				await localSalaries.delete(id);
				return;
			}
			await fetchWithAuth(`/salaries/${id}?deleteTransactions=${deleteTransactions}`, { method: "DELETE" });
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

		async update(id: string, data: Partial<Salary>): Promise<Salary> {
			if (isGuestMode()) {
				const existing = await localSalaries.getById(id);
				if (!existing) throw new Error("Salary not found");
				const hasTagChanges = data.tagIds !== undefined || data.categoryId !== undefined;
				const tagIds = data.tagIds ?? (data.categoryId ? [data.categoryId] : []);
				const updated: Salary = {
					...existing.data,
					...data,
					...(hasTagChanges && { categoryId: tagIds[0], tagIds }),
				};
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

	// ============== STORES ==============
	stores: {
		async create(name: string): Promise<Store> {
			if (isGuestMode()) {
				const store: Store = { id: crypto.randomUUID(), name, userId: getUserId() };
				await localStores.put(store, store.id);
				return store;
			}
			const store = await fetchWithAuth<Store>("/stores", {
				body: JSON.stringify({ name }),
				method: "POST",
			});
			await localStores.put(store, store.id);
			return store;
		},

		async getAll(): Promise<Store[]> {
			if (isGuestMode()) return (await localStores.getAll()).map(item => item.data);
			const stores = await fetchWithAuth<Store[]>("/stores");
			await localStores.bulkPut(stores.map(store => ({ data: store, localId: store.id })));
			return stores;
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

		async delete(id: string, deleteTransactions = false): Promise<void> {
			if (isGuestMode()) {
				if (deleteTransactions) {
					const transactions = await localTransactions.getAll();
					await Promise.all(
						transactions
							.filter(transaction => transaction.data.subscriptionId === id)
							.map(transaction => localTransactions.delete(transaction.localId)),
					);
				}
				await localSubscriptions.delete(id);
				return;
			}
			await fetchWithAuth(`/subscriptions/${id}?deleteTransactions=${deleteTransactions}`, {
				method: "DELETE",
			});
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
				const hasTagChanges = data.tagIds !== undefined || data.categoryId !== undefined;
				const tagIds = data.tagIds ?? (data.categoryId ? [data.categoryId] : []);
				const updated: Subscription = {
					...existing.data,
					...data,
					...(hasTagChanges && { categoryId: tagIds[0], tagIds }),
				};
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
					debtPeople,
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
					localDebtPeople.getAll(),
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
						debtPeople: DebtPerson[];
						salaries: Salary[];
						subscriptions: Subscription[];
					};
				}>("/sync", {
					body: JSON.stringify({
						categories: categories.map(c => c.data),
						creditCardStatements: creditCardStatements.map(statement => statement.data),
						creditCards: creditCards.map(card => card.data),
						creditPurchases: creditPurchases.map(purchase => purchase.data),
						debtPeople: debtPeople.map(person => person.data),
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
					localDebtPeople.clear().then(() =>
						localDebtPeople.bulkPut(
							response.serverData.debtPeople.map(person => ({
								data: person,
								localId: person.id,
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
		async create(
			data: Omit<Transaction, "id" | "createdAt"> & { matchDebtEventId?: string },
		): Promise<Transaction> {
			if (isGuestMode()) {
				const { matchDebtEventId: _, ...localData } = data;
				const recurrenceOccurrenceDate = data.recurrenceId
					? (data.recurrenceOccurrenceDate ?? data.date)
					: undefined;
				const salaryOccurrenceDate = data.salaryId ? (data.salaryOccurrenceDate ?? data.date) : undefined;
				const subscriptionOccurrenceDate = data.subscriptionId
					? (data.subscriptionOccurrenceDate ?? data.date)
					: undefined;
				if (recurrenceOccurrenceDate || salaryOccurrenceDate || subscriptionOccurrenceDate) {
					const existing = (await localTransactions.getAll()).find(
						item =>
							(Boolean(recurrenceOccurrenceDate) &&
								item.data.recurrenceId === data.recurrenceId &&
								item.data.recurrenceOccurrenceDate === recurrenceOccurrenceDate) ||
							(Boolean(salaryOccurrenceDate) &&
								item.data.salaryId === data.salaryId &&
								item.data.salaryOccurrenceDate === salaryOccurrenceDate) ||
							(Boolean(subscriptionOccurrenceDate) &&
								item.data.subscriptionId === data.subscriptionId &&
								item.data.subscriptionOccurrenceDate === subscriptionOccurrenceDate),
					);
					if (existing) return existing.data;
				}
				const hasExplicitTags = data.tagIds !== undefined || data.categoryId !== undefined;
				const [recurringPayment, salary, subscription] = await Promise.all([
					data.recurrenceId ? localRecurringPayments.getById(data.recurrenceId) : undefined,
					data.salaryId ? localSalaries.getById(data.salaryId) : undefined,
					data.subscriptionId ? localSubscriptions.getById(data.subscriptionId) : undefined,
				]);
				const linkedRecurrence = recurringPayment?.data ?? salary?.data ?? subscription?.data;
				const tagIds = hasExplicitTags
					? (data.tagIds ?? (data.categoryId ? [data.categoryId] : []))
					: (linkedRecurrence?.tagIds ?? (linkedRecurrence?.categoryId ? [linkedRecurrence.categoryId] : []));
				const newTransaction: Transaction = {
					...localData,
					categoryId: tagIds[0],
					createdAt: new Date().toISOString(),
					id: crypto.randomUUID(),
					recurrenceOccurrenceDate,
					salaryOccurrenceDate,
					subscriptionOccurrenceDate,
					tagIds,
					time: data.time === undefined ? getCurrentLocalTime() : data.time,
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
								creditCardId: card.id,
								creditCardStatementId: purchase.statementId,
								currentInstallment: purchase.currentInstallment,
								date: purchase.purchaseDate,
								debtPersonId: purchase.debtPersonId,
								debtPersonName: purchase.debtPersonName,
								description: purchase.description,
								id: purchase.id,
								installmentAmount: purchase.installmentAmount,
								installments: purchase.installments,
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
								storeName: purchase.storeName,
								tagIds,
								tags,
								time: purchase.time,
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
						const paymentAccount = item.data.type === "INCOME" ? destinationAccount : originAccount;

						return {
							...item.data,
							destinationAccountType: destinationAccount?.type,
							destinationName,
							originAccountType: originAccount?.type,
							originName,
							source:
								item.data.type !== "TRANSFER" &&
								paymentAccount?.type === "CREDIT_CARD" &&
								!item.data.recurrenceId &&
								!item.data.salaryId &&
								!item.data.subscriptionId
									? ("CREDIT_CARD" as const)
									: ("FINANCIAL_ACCOUNT" as const),
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

		async update(
			id: string,
			data: Omit<Partial<Transaction>, "debtPersonId"> & { debtPersonId?: null | string },
		): Promise<Transaction> {
			if (isGuestMode()) {
				const existing = await localTransactions.getById(id);
				if (!existing) throw new Error("Transação não encontrada");
				const updated: Transaction = {
					...existing.data,
					...data,
					debtPersonId: data.debtPersonId ?? undefined,
				};
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
