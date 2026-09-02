import type {
	Category,
	CreditCard,
	CreditCardStatement,
	CreditPurchase,
	Debt,
	DebtPerson,
	FinancialAccount,
	Loan,
	RecurringPayment,
	Salary,
	Store,
	Subscription,
	Transaction,
} from "@/lib/api";

const DB_NAME = "zaimu-local";
const DB_VERSION = 4;

// Store names
const STORES = {
	accounts: "accounts",
	categories: "categories",
	creditCardStatements: "creditCardStatements",
	creditCards: "creditCards",
	creditPurchases: "creditPurchases",
	debtPeople: "debtPeople",
	debts: "debts",
	loans: "loans",
	meta: "meta", // For sync timestamps, etc.
	recurringPayments: "recurringPayments",
	salaries: "salaries",
	stores: "stores",
	subscriptions: "subscriptions",
	transactions: "transactions",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

// Types for local storage with sync metadata
export interface LocalData<T> {
	data: T;
	localId: string;
	syncedAt?: number;
	modifiedAt: number;
	deleted?: boolean;
}

let db: IDBDatabase | null = null;

// Initialize the database
export async function initLocalDb(): Promise<IDBDatabase> {
	if (db) return db;

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);

		request.onsuccess = () => {
			db = request.result;
			resolve(db);
		};

		request.onupgradeneeded = event => {
			const database = (event.target as IDBOpenDBRequest).result;

			// Create object stores with indexes
			for (const storeName of Object.values(STORES)) {
				if (!database.objectStoreNames.contains(storeName)) {
					const store = database.createObjectStore(storeName, { keyPath: "localId" });
					store.createIndex("syncedAt", "syncedAt", { unique: false });
					store.createIndex("modifiedAt", "modifiedAt", { unique: false });
					store.createIndex("deleted", "deleted", { unique: false });
				}
			}
		};
	});
}

// Generic CRUD operations
async function getStore(
	storeName: StoreName,
	mode: IDBTransactionMode = "readonly",
): Promise<IDBObjectStore> {
	const database = await initLocalDb();
	const transaction = database.transaction(storeName, mode);
	return transaction.objectStore(storeName);
}

// Get all items from a store
export async function getAll<T>(storeName: StoreName): Promise<LocalData<T>[]> {
	const store = await getStore(storeName);
	return new Promise((resolve, reject) => {
		const request = store.getAll();
		request.onsuccess = () => {
			// Filter out deleted items
			const results = (request.result as LocalData<T>[]).filter(item => !item.deleted);
			resolve(results);
		};
		request.onerror = () => reject(request.error);
	});
}

// Get a single item by ID
export async function getById<T>(storeName: StoreName, localId: string): Promise<LocalData<T> | undefined> {
	const store = await getStore(storeName);
	return new Promise((resolve, reject) => {
		const request = store.get(localId);
		request.onsuccess = () => {
			const result = request.result as LocalData<T> | undefined;
			if (result?.deleted) {
				resolve(undefined);
			} else {
				resolve(result);
			}
		};
		request.onerror = () => reject(request.error);
	});
}

// Add or update an item
export async function put<T>(storeName: StoreName, data: T, localId?: string): Promise<string> {
	const store = await getStore(storeName, "readwrite");
	const id = localId || crypto.randomUUID();

	const localData: LocalData<T> = {
		data,
		localId: id,
		modifiedAt: Date.now(),
	};

	return new Promise((resolve, reject) => {
		const request = store.put(localData);
		request.onsuccess = () => resolve(id);
		request.onerror = () => reject(request.error);
	});
}

// Soft delete (mark as deleted for sync)
export async function softDelete(storeName: StoreName, localId: string): Promise<void> {
	const store = await getStore(storeName, "readwrite");
	return new Promise((resolve, reject) => {
		const getRequest = store.get(localId);
		getRequest.onsuccess = () => {
			const item = getRequest.result;
			if (item) {
				item.deleted = true;
				item.modifiedAt = Date.now();
				const putRequest = store.put(item);
				putRequest.onsuccess = () => resolve();
				putRequest.onerror = () => reject(putRequest.error);
			} else {
				resolve();
			}
		};
		getRequest.onerror = () => reject(getRequest.error);
	});
}

// Hard delete
export async function hardDelete(storeName: StoreName, localId: string): Promise<void> {
	const store = await getStore(storeName, "readwrite");
	return new Promise((resolve, reject) => {
		const request = store.delete(localId);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Get items modified since last sync
export async function getModifiedSince<T>(storeName: StoreName, since: number): Promise<LocalData<T>[]> {
	const store = await getStore(storeName);
	const index = store.index("modifiedAt");

	return new Promise((resolve, reject) => {
		const range = IDBKeyRange.lowerBound(since, true);
		const request = index.getAll(range);
		request.onsuccess = () => resolve(request.result as LocalData<T>[]);
		request.onerror = () => reject(request.error);
	});
}

// Bulk put items (for sync)
export async function bulkPut<T>(
	storeName: StoreName,
	items: Array<{ data: T; localId: string; syncedAt?: number }>,
): Promise<void> {
	const store = await getStore(storeName, "readwrite");

	return new Promise((resolve, reject) => {
		let completed = 0;
		const total = items.length;

		if (total === 0) {
			resolve();
			return;
		}

		for (const item of items) {
			const localData: LocalData<T> = {
				data: item.data,
				localId: item.localId,
				modifiedAt: Date.now(),
				syncedAt: item.syncedAt || Date.now(),
			};

			const request = store.put(localData);
			request.onsuccess = () => {
				completed++;
				if (completed === total) resolve();
			};
			request.onerror = () => reject(request.error);
		}
	});
}

// Clear all data from a store
export async function clearStore(storeName: StoreName): Promise<void> {
	const store = await getStore(storeName, "readwrite");
	return new Promise((resolve, reject) => {
		const request = store.clear();
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Clear all local data
export async function clearAllLocalData(): Promise<void> {
	for (const storeName of Object.values(STORES)) {
		await clearStore(storeName);
	}
}

// Export specific store helpers
export const localAccounts = {
	bulkPut: (items: Array<{ data: FinancialAccount; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.accounts, items),
	clear: () => clearStore(STORES.accounts),
	delete: (id: string) => softDelete(STORES.accounts, id),
	getAll: () => getAll<FinancialAccount>(STORES.accounts),
	getById: (id: string) => getById<FinancialAccount>(STORES.accounts, id),
	getModifiedSince: (since: number) => getModifiedSince<FinancialAccount>(STORES.accounts, since),
	put: (data: FinancialAccount, id?: string) => put(STORES.accounts, data, id),
};

export const localCategories = {
	bulkPut: (items: Array<{ data: Category; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.categories, items),
	clear: () => clearStore(STORES.categories),
	delete: (id: string) => softDelete(STORES.categories, id),
	getAll: () => getAll<Category>(STORES.categories),
	getById: (id: string) => getById<Category>(STORES.categories, id),
	getModifiedSince: (since: number) => getModifiedSince<Category>(STORES.categories, since),
	put: (data: Category, id?: string) => put(STORES.categories, data, id),
};

export const localStores = {
	bulkPut: (items: Array<{ data: Store; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.stores, items),
	clear: () => clearStore(STORES.stores),
	delete: (id: string) => softDelete(STORES.stores, id),
	getAll: () => getAll<Store>(STORES.stores),
	getById: (id: string) => getById<Store>(STORES.stores, id),
	put: (data: Store, id?: string) => put(STORES.stores, data, id),
};

export const localTransactions = {
	bulkPut: (items: Array<{ data: Transaction; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.transactions, items),
	clear: () => clearStore(STORES.transactions),
	delete: (id: string) => softDelete(STORES.transactions, id),
	getAll: () => getAll<Transaction>(STORES.transactions),
	getById: (id: string) => getById<Transaction>(STORES.transactions, id),
	getModifiedSince: (since: number) => getModifiedSince<Transaction>(STORES.transactions, since),
	put: (data: Transaction, id?: string) => put(STORES.transactions, data, id),
};

export const localLoans = {
	bulkPut: (items: Array<{ data: Loan; localId: string; syncedAt?: number }>) => bulkPut(STORES.loans, items),
	clear: () => clearStore(STORES.loans),
	delete: (id: string) => softDelete(STORES.loans, id),
	getAll: () => getAll<Loan>(STORES.loans),
	getById: (id: string) => getById<Loan>(STORES.loans, id),
	getModifiedSince: (since: number) => getModifiedSince<Loan>(STORES.loans, since),
	put: (data: Loan, id?: string) => put(STORES.loans, data, id),
};

export const localDebts = {
	bulkPut: (items: Array<{ data: Debt; localId: string; syncedAt?: number }>) => bulkPut(STORES.debts, items),
	clear: () => clearStore(STORES.debts),
	delete: (id: string) => softDelete(STORES.debts, id),
	getAll: () => getAll<Debt>(STORES.debts),
	getById: (id: string) => getById<Debt>(STORES.debts, id),
	getModifiedSince: (since: number) => getModifiedSince<Debt>(STORES.debts, since),
	put: (data: Debt, id?: string) => put(STORES.debts, data, id),
};

export const localDebtPeople = {
	bulkPut: (items: Array<{ data: DebtPerson; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.debtPeople, items),
	clear: () => clearStore(STORES.debtPeople),
	delete: (id: string) => softDelete(STORES.debtPeople, id),
	getAll: () => getAll<DebtPerson>(STORES.debtPeople),
	getById: (id: string) => getById<DebtPerson>(STORES.debtPeople, id),
	getModifiedSince: (since: number) => getModifiedSince<DebtPerson>(STORES.debtPeople, since),
	put: (data: DebtPerson, id?: string) => put(STORES.debtPeople, data, id),
};

export const localSalaries = {
	bulkPut: (items: Array<{ data: Salary; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.salaries, items),
	clear: () => clearStore(STORES.salaries),
	delete: (id: string) => softDelete(STORES.salaries, id),
	getAll: () => getAll<Salary>(STORES.salaries),
	getById: (id: string) => getById<Salary>(STORES.salaries, id),
	getModifiedSince: (since: number) => getModifiedSince<Salary>(STORES.salaries, since),
	put: (data: Salary, id?: string) => put(STORES.salaries, data, id),
};

export const localSubscriptions = {
	bulkPut: (items: Array<{ data: Subscription; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.subscriptions, items),
	clear: () => clearStore(STORES.subscriptions),
	delete: (id: string) => softDelete(STORES.subscriptions, id),
	getAll: () => getAll<Subscription>(STORES.subscriptions),
	getById: (id: string) => getById<Subscription>(STORES.subscriptions, id),
	getModifiedSince: (since: number) => getModifiedSince<Subscription>(STORES.subscriptions, since),
	put: (data: Subscription, id?: string) => put(STORES.subscriptions, data, id),
};

export const localCreditCards = {
	bulkPut: (items: Array<{ data: CreditCard; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.creditCards, items),
	clear: () => clearStore(STORES.creditCards),
	delete: (id: string) => softDelete(STORES.creditCards, id),
	getAll: () => getAll<CreditCard>(STORES.creditCards),
	getById: (id: string) => getById<CreditCard>(STORES.creditCards, id),
	put: (data: CreditCard, id?: string) => put(STORES.creditCards, data, id),
};

export const localCreditCardStatements = {
	bulkPut: (items: Array<{ data: CreditCardStatement; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.creditCardStatements, items),
	clear: () => clearStore(STORES.creditCardStatements),
	getAll: () => getAll<CreditCardStatement>(STORES.creditCardStatements),
	getById: (id: string) => getById<CreditCardStatement>(STORES.creditCardStatements, id),
	put: (data: CreditCardStatement, id?: string) => put(STORES.creditCardStatements, data, id),
};

export const localCreditPurchases = {
	bulkPut: (items: Array<{ data: CreditPurchase; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.creditPurchases, items),
	clear: () => clearStore(STORES.creditPurchases),
	delete: (id: string) => softDelete(STORES.creditPurchases, id),
	getAll: () => getAll<CreditPurchase>(STORES.creditPurchases),
	getById: (id: string) => getById<CreditPurchase>(STORES.creditPurchases, id),
	put: (data: CreditPurchase, id?: string) => put(STORES.creditPurchases, data, id),
};

export const localRecurringPayments = {
	bulkPut: (items: Array<{ data: RecurringPayment; localId: string; syncedAt?: number }>) =>
		bulkPut(STORES.recurringPayments, items),
	clear: () => clearStore(STORES.recurringPayments),
	delete: (id: string) => softDelete(STORES.recurringPayments, id),
	getAll: () => getAll<RecurringPayment>(STORES.recurringPayments),
	getById: (id: string) => getById<RecurringPayment>(STORES.recurringPayments, id),
	put: (data: RecurringPayment, id?: string) => put(STORES.recurringPayments, data, id),
};

// Meta store for sync state
export const localMeta = {
	get: async (key: string): Promise<unknown> => {
		const store = await getStore(STORES.meta);
		return new Promise((resolve, reject) => {
			const request = store.get(key);
			request.onsuccess = () => resolve(request.result?.data);
			request.onerror = () => reject(request.error);
		});
	},
	set: async (key: string, value: unknown): Promise<void> => {
		const store = await getStore(STORES.meta, "readwrite");
		return new Promise((resolve, reject) => {
			const request = store.put({ data: value, localId: key, modifiedAt: Date.now() });
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	},
};
