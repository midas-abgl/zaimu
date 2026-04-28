import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export const AmortizationType = {
    PRICE: "PRICE",
    SAC: "SAC",
    SACRE: "SACRE"
} as const;
export type AmortizationType = (typeof AmortizationType)[keyof typeof AmortizationType];
export const AdvanceType = {
    FRONT: "FRONT",
    BACK: "BACK"
} as const;
export type AdvanceType = (typeof AdvanceType)[keyof typeof AdvanceType];
export const TransactionType = {
    INCOME: "INCOME",
    EXPENSE: "EXPENSE",
    TRANSFER: "TRANSFER"
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
export const RecurrenceFrequency = {
    DAILY: "DAILY",
    WEEKLY: "WEEKLY",
    BIWEEKLY: "BIWEEKLY",
    MONTHLY: "MONTHLY",
    YEARLY: "YEARLY"
} as const;
export type RecurrenceFrequency = (typeof RecurrenceFrequency)[keyof typeof RecurrenceFrequency];
export const PaymentMethod = {
    DEBIT: "DEBIT",
    CREDIT: "CREDIT",
    PIX: "PIX",
    CASH: "CASH",
    TRANSFER: "TRANSFER",
    BOLETO: "BOLETO"
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const AccountType = {
    CHECKING: "CHECKING",
    SAVINGS: "SAVINGS",
    INVESTMENT: "INVESTMENT",
    CASH: "CASH",
    CREDIT_CARD: "CREDIT_CARD"
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];
export type Account = {
    id: Generated<string>;
    userId: string;
    name: string;
    type: Generated<AccountType>;
    balance: Generated<number>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Category = {
    id: Generated<string>;
    userId: string;
    name: string;
    color: string | null;
    icon: string | null;
    parentId: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type CreditCard = {
    id: Generated<string>;
    accountId: string;
    creditLimit: number;
    statementDay: number;
    dueDay: number;
    workingDueDate: Generated<boolean>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type CreditCardHistory = {
    id: Generated<string>;
    creditCardId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Generated<Timestamp>;
};
export type CreditCardStatement = {
    id: Generated<string>;
    creditCardId: string;
    statementDate: Timestamp;
    dueDate: Timestamp;
    totalAmount: Generated<number>;
    paidAmount: Generated<number>;
    isPaid: Generated<boolean>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type CreditPurchase = {
    id: Generated<string>;
    statementId: string;
    description: string;
    totalAmount: number;
    installments: Generated<number>;
    currentInstallment: Generated<number>;
    installmentAmount: number;
    purchaseDate: Timestamp;
    categoryId: string | null;
    parentId: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type CreditPurchaseHistory = {
    id: Generated<string>;
    creditPurchaseId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Generated<Timestamp>;
};
export type Debt = {
    id: Generated<string>;
    userId: string;
    personName: string;
    amount: number;
    description: string | null;
    isOwedToMe: Generated<boolean>;
    date: Timestamp;
    dueDate: Timestamp | null;
    isPaid: Generated<boolean>;
    paidDate: Timestamp | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type DebtHistory = {
    id: Generated<string>;
    debtId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Generated<Timestamp>;
};
export type Loan = {
    id: Generated<string>;
    userId: string;
    lender: string;
    principalAmount: number;
    interestRate: number;
    totalInstallments: number;
    installmentAmount: number;
    dueDay: number;
    startDate: Timestamp;
    firstDueDate: Timestamp;
    description: string | null;
    amortization: Generated<AmortizationType>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type LoanHistory = {
    id: Generated<string>;
    loanId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Generated<Timestamp>;
};
export type LoanPayment = {
    id: Generated<string>;
    loanId: string;
    accountId: string | null;
    installmentNumber: number;
    principalPaid: number;
    interestPaid: number;
    totalPaid: number;
    dueDate: Timestamp;
    paidDate: Timestamp | null;
    isAdvanced: Generated<boolean>;
    advanceType: AdvanceType | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type RecurringPayment = {
    id: Generated<string>;
    userId: string;
    name: string;
    amount: number;
    frequency: RecurrenceFrequency;
    dayOfMonth: number | null;
    dayOfWeek: number | null;
    startDate: Timestamp;
    endDate: Timestamp | null;
    categoryId: string | null;
    paymentMethod: Generated<PaymentMethod>;
    isActive: Generated<boolean>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type RecurringPaymentHistory = {
    id: Generated<string>;
    recurringPaymentId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Generated<Timestamp>;
};
export type Salary = {
    id: Generated<string>;
    userId: string;
    source: string;
    grossAmount: number;
    netAmount: number;
    frequency: Generated<RecurrenceFrequency>;
    payDay: number;
    startDate: Timestamp;
    endDate: Timestamp | null;
    isActive: Generated<boolean>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type SalaryHistory = {
    id: Generated<string>;
    salaryId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Generated<Timestamp>;
};
export type SalaryPayment = {
    id: Generated<string>;
    salaryId: string;
    accountId: string;
    amount: number;
    date: Timestamp;
    notes: string | null;
    createdAt: Generated<Timestamp>;
};
export type Subscription = {
    id: Generated<string>;
    userId: string;
    name: string;
    amount: number;
    billingDay: number;
    frequency: Generated<RecurrenceFrequency>;
    paymentMethod: Generated<PaymentMethod>;
    startDate: Timestamp;
    endDate: Timestamp | null;
    isActive: Generated<boolean>;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type SubscriptionHistory = {
    id: Generated<string>;
    subscriptionId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Generated<Timestamp>;
};
export type Transaction = {
    id: Generated<string>;
    amount: number;
    date: Timestamp;
    description: string | null;
    type: Generated<TransactionType>;
    categoryId: string | null;
    recurrenceId: string | null;
    originId: string | null;
    destinationId: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type TransactionHistory = {
    id: Generated<string>;
    transactionId: string;
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Generated<Timestamp>;
};
export type User = {
    id: Generated<string>;
    email: string;
    password: string;
    name: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type DB = {
    Account: Account;
    Category: Category;
    CreditCard: CreditCard;
    CreditCardHistory: CreditCardHistory;
    CreditCardStatement: CreditCardStatement;
    CreditPurchase: CreditPurchase;
    CreditPurchaseHistory: CreditPurchaseHistory;
    Debt: Debt;
    DebtHistory: DebtHistory;
    Loan: Loan;
    LoanHistory: LoanHistory;
    LoanPayment: LoanPayment;
    RecurringPayment: RecurringPayment;
    RecurringPaymentHistory: RecurringPaymentHistory;
    Salary: Salary;
    SalaryHistory: SalaryHistory;
    SalaryPayment: SalaryPayment;
    Subscription: Subscription;
    SubscriptionHistory: SubscriptionHistory;
    Transaction: Transaction;
    TransactionHistory: TransactionHistory;
    User: User;
};
