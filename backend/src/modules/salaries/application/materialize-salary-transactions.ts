import { addDays, addMonths, addWeeks, addYears, format, isAfter, startOfDay } from "date-fns";
import { db, executeStatement, numeric, param, queryRows } from "~/shared/infra/sql";

type SalaryFrequency = "BIWEEKLY" | "DAILY" | "MONTHLY" | "WEEKLY" | "YEARLY";

function isUniqueViolation(error: unknown) {
	return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export function salaryOccurrenceDates(
	frequency: SalaryFrequency,
	startDate: Date,
	endDate?: Date | null,
	today = new Date(),
): string[] {
	const occurrences: string[] = [];
	const currentDay = startOfDay(today);
	const end = endDate ? startOfDay(endDate) : currentDay;
	let occurrence = startOfDay(startDate);

	while (!isAfter(occurrence, currentDay) && !isAfter(occurrence, end)) {
		occurrences.push(format(occurrence, "yyyy-MM-dd"));
		switch (frequency) {
			case "DAILY":
				occurrence = addDays(occurrence, 1);
				break;
			case "WEEKLY":
				occurrence = addWeeks(occurrence, 1);
				break;
			case "BIWEEKLY":
				occurrence = addWeeks(occurrence, 2);
				break;
			case "MONTHLY":
				occurrence = addMonths(occurrence, 1);
				break;
			case "YEARLY":
				occurrence = addYears(occurrence, 1);
				break;
		}
	}

	return occurrences;
}

export async function materializeSalaryTransactions(userId: string) {
	const salaries = await queryRows(
		db.sql.public.Salary.select(
			"id",
			"amount",
			"autoGenerateFrom",
			"endDate",
			"financialAccountId",
			"frequency",
			"source",
			"startDate",
		)
			.where((fields, functions) =>
				functions.and(functions.eq(fields.userId, userId), functions.eq(fields.isActive, true)),
			)
			.build(),
	);

	for (const salary of salaries) {
		if (!salary.financialAccountId) continue;
		const transactions = await queryRows(
			db.sql.public.Transaction.select("salaryOccurrenceDate")
				.where((fields, functions) => functions.eq(fields.salaryId, salary.id))
				.build(),
		);
		const scheduledDates = new Set(
			transactions.flatMap(transaction =>
				transaction.salaryOccurrenceDate
					? [format(new Date(transaction.salaryOccurrenceDate), "yyyy-MM-dd")]
					: [],
			),
		);
		const dates = salaryOccurrenceDates(
			salary.frequency as SalaryFrequency,
			salary.startDate,
			salary.endDate,
		).filter(date => date >= format(salary.autoGenerateFrom, "yyyy-MM-dd") && !scheduledDates.has(date));

		for (const date of dates) {
			try {
				await executeStatement(
					db.sql.public.Transaction.insert([
						{
							amount: String(salary.amount),
							date: new Date(date),
							description: salary.source,
							destinationFinancialAccountId: salary.financialAccountId,
							salaryId: salary.id,
							salaryOccurrenceDate: new Date(date),
							type: "INCOME",
						},
					]).build(),
				);
			} catch (error) {
				if (isUniqueViolation(error)) continue;
				throw error;
			}
			const amount = param(numeric<12, 2>(salary.amount), { codecId: "pg/numeric@1" });
			await executeStatement(
				db.sql.public.FinancialAccount.update((fields, functions) => ({
					balance: functions.raw`${fields.balance} + ${amount}`.returns("pg/numeric@1"),
					updatedAt: functions.raw`CURRENT_TIMESTAMP`.returns("pg/timestamp@1"),
				}))
					.where((fields, functions) => functions.eq(fields.id, salary.financialAccountId!))
					.build(),
			);
		}
	}
}
