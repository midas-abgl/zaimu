import type { FinancialAccount, RecurringPayment, Salary, Subscription } from "@/lib/api";
import { getFinancialAccountDisplayName } from "@/lib/financial-account";
import type { RecurrenceFrequency, RecurringListItemData } from "./types";

export function toMonthlyAmount(amount: number, frequency: RecurrenceFrequency) {
	switch (frequency) {
		case "DAILY":
			return (amount * 365.25) / 12;
		case "WEEKLY":
			return (amount * 52) / 12;
		case "BIWEEKLY":
			return (amount * 26) / 12;
		case "YEARLY":
			return amount / 12;
		default:
			return amount;
	}
}

export function salaryToListItem(salary: Salary, accounts: FinancialAccount[] = []): RecurringListItemData {
	const account = accounts.find(item => item.id === salary.financialAccountId);
	return {
		accountName: account ? getFinancialAccountDisplayName(account) : undefined,
		active: salary.isActive,
		amount: Number(salary.amount),
		day: salary.payDay,
		direction: "INCOME",
		financialAccountId: salary.financialAccountId ?? undefined,
		frequency: salary.frequency,
		id: salary.id,
		monthlyAmount: toMonthlyAmount(Number(salary.amount), salary.frequency),
		source: "salary",
		startDate: salary.startDate,
		title: salary.source,
	};
}

export function subscriptionToListItem(subscription: Subscription): RecurringListItemData {
	return {
		active: subscription.isActive,
		amount: Number(subscription.amount),
		day: subscription.billingDay,
		direction: "EXPENSE",
		frequency: subscription.frequency,
		id: subscription.id,
		monthlyAmount: toMonthlyAmount(Number(subscription.amount), subscription.frequency),
		paymentMethod: subscription.paymentMethod,
		source: "subscription",
		startDate: subscription.startDate,
		title: subscription.name,
	};
}

export function recurringPaymentToListItem(payment: RecurringPayment): RecurringListItemData {
	return {
		active: payment.isActive,
		amount: Number(payment.amount),
		day: payment.dayOfMonth ?? payment.day ?? null,
		direction: "EXPENSE",
		frequency: payment.frequency,
		id: payment.id,
		monthlyAmount: toMonthlyAmount(Number(payment.amount), payment.frequency),
		paymentMethod: payment.paymentMethod,
		source: "recurring",
		startDate: payment.startDate,
		tags: payment.tags,
		title: payment.name,
	};
}
