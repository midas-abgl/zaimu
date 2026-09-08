import { addDays, startOfDay } from "date-fns";
import { db, executeStatement, nullableNumeric, param, queryFirst } from "~/shared/infra/sql";
import type { YieldPeriod } from "../domain/calculate-financial-account-yields";

export async function scheduleFinancialAccountYieldRate({
	effectiveDate,
	financialAccountId,
	yieldFixedRate,
	yieldPeriod,
	yieldReferencePercentage,
	yieldReferenceRate,
	yieldTaxRate,
}: {
	effectiveDate: Date;
	financialAccountId: string;
	yieldFixedRate?: null | number;
	yieldPeriod?: null | YieldPeriod;
	yieldReferencePercentage?: null | number;
	yieldReferenceRate?: null | number;
	yieldTaxRate?: null | number;
}) {
	const date = startOfDay(effectiveDate);
	await executeStatement(
		db.sql.public.FinancialAccountYieldRateHistory.delete()
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.financialAccountId, financialAccountId),
					functions.raw`${fields.effectiveDate} > ${param(date, { codecId: "pg/date@1" })}`.returns(
						"pg/bool@1",
					),
				),
			)
			.build(),
	);
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
		yieldFixedRate: nullableNumeric<7, 4>(yieldFixedRate ?? null),
		yieldPeriod: yieldPeriod ?? null,
		yieldReferencePercentage: nullableNumeric<7, 4>(yieldReferencePercentage ?? null),
		yieldReferenceRate: nullableNumeric<7, 4>(yieldReferenceRate ?? null),
		yieldTaxRate: nullableNumeric<5, 2>(yieldTaxRate ?? null),
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
