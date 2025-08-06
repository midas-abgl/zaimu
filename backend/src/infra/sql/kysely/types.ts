import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type Account = {
    id: Generated<string>;
    userEmail: string;
    company: string;
    income: Record<string,any> | null;
    creditCard: Record<string,any> | null;
    creditLine: number | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Broker = {
    id: Generated<string>;
    name: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type CreditCardStatement = {
    id: Generated<string>;
    accountId: string;
    statementDate: Timestamp;
    dueDate: Timestamp;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type CreditPurchase = {
    id: Generated<string>;
    description: string | null;
    value: number;
    date: Timestamp | null;
    categories: string[];
    statementId: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Loan = {
    id: Generated<string>;
    accountId: string;
    date: Timestamp;
    amount: number;
    installment: number;
    months: number;
    dueDate: number;
    description: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type LoanPayment = {
    id: Generated<string>;
    amount: number;
    date: Timestamp;
    loanId: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Portfolio = {
    id: Generated<string>;
    name: string | null;
    description: string | null;
    strategy: string | null;
    userEmail: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type PortfolioStock = {
    portfolioId: string;
    ticker: string;
    allocation: number | null;
    quantity: number | null;
    meanPrice: number | null;
    groupId: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type PortfolioStockGroup = {
    id: Generated<string>;
    portfolioId: string;
    description: string | null;
    strategy: string | null;
    allocation: Generated<number>;
};
export type PortfolioTransaction = {
    id: Generated<string>;
    ticker: string;
    quantity: number;
    price: number;
    totalFees: number | null;
    date: Generated<Timestamp>;
    brokerId: string;
    portfolioId: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Stock = {
    ticker: string;
    pastTickers: string[];
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type Transaction = {
    id: Generated<string>;
    amount: number;
    date: Timestamp;
    description: string | null;
    categories: string[];
    recurrence: string | null;
    repeatCount: number | null;
    eventId: string | null;
    originId: string | null;
    destinationId: string | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type User = {
    email: string;
    password: string;
    createdAt: Generated<Timestamp>;
    updatedAt: Generated<Timestamp>;
};
export type DB = {
    Account: Account;
    Broker: Broker;
    CreditCardStatement: CreditCardStatement;
    CreditPurchase: CreditPurchase;
    Loan: Loan;
    LoanPayment: LoanPayment;
    Portfolio: Portfolio;
    PortfolioStock: PortfolioStock;
    PortfolioStockGroup: PortfolioStockGroup;
    PortfolioTransaction: PortfolioTransaction;
    Stock: Stock;
    Transaction: Transaction;
    User: User;
};
