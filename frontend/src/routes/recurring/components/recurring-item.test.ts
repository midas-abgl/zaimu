import { describe, expect, test } from "bun:test";
import type { FinancialAccount, RecurringPayment, Salary, Subscription } from "@/lib/api";
import {
	recurringPaymentToListItem,
	salaryToListItem,
	subscriptionToListItem,
	toMonthlyAmount,
} from "./recurring-item";

describe("recurring item normalization", () => {
	test("normalizes every frequency to a monthly amount", () => {
		expect(toMonthlyAmount(10, "DAILY")).toBeCloseTo(304.375);
		expect(toMonthlyAmount(100, "WEEKLY")).toBeCloseTo(433.333);
		expect(toMonthlyAmount(100, "BIWEEKLY")).toBeCloseTo(216.667);
		expect(toMonthlyAmount(100, "MONTHLY")).toBe(100);
		expect(toMonthlyAmount(1_200, "YEARLY")).toBe(100);
	});

	test("classifies salaries as income", () => {
		const salary = {
			amount: 4_000,
			financialAccountId: "account-id",
			frequency: "MONTHLY",
			id: "salary-id",
			isActive: true,
			payDay: 5,
			source: "Empresa",
		} as Salary;

		expect(
			salaryToListItem(salary, [
				{ id: "account-id", name: "Principal", type: "CHECKING" } as FinancialAccount,
			]),
		).toMatchObject({
			accountName: "Principal",
			amount: 4_000,
			direction: "INCOME",
			source: "salary",
		});
	});

	test("classifies subscriptions and recurring payments as expenses", () => {
		const subscription = {
			amount: 39.9,
			billingDay: 15,
			frequency: "MONTHLY",
			id: "subscription-id",
			isActive: true,
			name: "Streaming",
			paymentMethod: "CREDIT",
		} as Subscription;
		const payment = {
			amount: 1_500,
			dayOfMonth: 10,
			frequency: "MONTHLY",
			id: "recurring-id",
			isActive: true,
			name: "Aluguel",
			paymentMethod: "PIX",
		} as RecurringPayment;

		expect(subscriptionToListItem(subscription).direction).toBe("EXPENSE");
		expect(recurringPaymentToListItem(payment).direction).toBe("EXPENSE");
	});
});
