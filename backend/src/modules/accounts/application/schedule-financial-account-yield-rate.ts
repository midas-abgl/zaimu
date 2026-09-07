import { addDays, startOfDay } from "date-fns";
import { db, executeStatement, nullableNumeric, queryFirst } from "~/shared/infra/sql";
import type { YieldPeriod } from "../domain/calculate-financial-account-yields";

export async function scheduleFinancialAccountYieldRate({
	effectiveDate,
	financialAccountId,
	yieldPeriod,
	yieldRate,
}: {
	effectiveDate: Date;
	financialAccountId: string;
	yieldPeriod?: null | YieldPeriod;
	yieldRate?: null | number;
}) {
	const date = startOfDay(effectiveDate);
	const existing = await queryFirst(
		db.sql.public.FinancialAccountYieldRateHistory.select("id")
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.financialAccountId, financialAccountId),
					functions.eq(fields.effectiveDate, date),
				),
			)
			.limit(1)
			.build(),
	);
	const values = {
		effectiveDate: date,
		updatedAt: new Date(),
		yieldPeriod: yieldPeriod ?? null,
		yieldRate: nullableNumeric<7, 4>(yieldRate ?? null),
	};
	if (existing) {
		await executeStatement(
			db.sql.public.FinancialAccountYieldRateHistory.update(values)
				.where((fields, functions) => functions.eq(fields.id, existing.id))
				.build(),
		);
		return;
	}
	await executeStatement(
		db.sql.public.FinancialAccountYieldRateHistory.insert([{ ...values, financialAccountId }]).build(),
	);
}

export const tomorrow = () => addDays(startOfDay(new Date()), 1);
