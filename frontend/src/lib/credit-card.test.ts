import { describe, expect, test } from "bun:test";
import type { CreditCardStatement } from "./api";
import { applyStatementCredits } from "./credit-card";

const statement = (
	id: string,
	statementDate: string,
	totalAmount: number,
	paidAmount: number,
): CreditCardStatement => ({
	balanceAmount: totalAmount - paidAmount,
	creditCardId: "card-id",
	dueDate: statementDate,
	id,
	isPaid: false,
	paidAmount,
	statementDate,
	totalAmount,
});

describe("applyStatementCredits", () => {
	test("carries an overpayment into following statements", () => {
		const result = applyStatementCredits(
			[statement("second", "2026-09-01", 80, 0), statement("first", "2026-08-01", 100, 150)],
			"2026-08-02",
		);

		expect(result).toEqual([
			expect.objectContaining({ balanceAmount: 30, id: "second", isPaid: false }),
			expect.objectContaining({ balanceAmount: 0, id: "first", isPaid: true }),
		]);
	});

	test("recalculates credit when older purchases are filled later", () => {
		const result = applyStatementCredits(
			[statement("first", "2026-08-01", 150, 150), statement("second", "2026-09-01", 80, 0)],
			"2026-08-02",
		);

		expect(result).toEqual([
			expect.objectContaining({ balanceAmount: 0, id: "first", isPaid: true }),
			expect.objectContaining({ balanceAmount: 80, id: "second", isPaid: false }),
		]);
	});

	test("advances credit before closing and keeps the last remainder negative", () => {
		const result = applyStatementCredits(
			[statement("current", "2026-09-04", 100, 150), statement("next", "2026-10-04", 80, 0)],
			"2026-09-03",
		);

		expect(result).toEqual([
			expect.objectContaining({ balanceAmount: 0, id: "current", isPaid: false }),
			expect.objectContaining({ balanceAmount: 30, id: "next", isPaid: false }),
		]);
	});

	test("keeps a partial pre-closing payment open", () => {
		const result = applyStatementCredits([statement("current", "2026-09-04", 100, 40)], "2026-09-03");

		expect(result).toEqual([expect.objectContaining({ balanceAmount: 60, id: "current", isPaid: false })]);
	});

	test("recalculates excess credit through every following statement", () => {
		const result = applyStatementCredits(
			[
				statement("first", "2026-09-04", 100, 350),
				statement("second", "2026-10-04", 80, 0),
				statement("third", "2026-11-04", 20, 0),
			],
			"2026-09-03",
		);

		expect(result).toEqual([
			expect.objectContaining({ balanceAmount: 0, id: "first" }),
			expect.objectContaining({ balanceAmount: -170, id: "second" }),
			expect.objectContaining({ balanceAmount: -150, id: "third" }),
		]);
	});

	test("shows the remaining credit on every following statement after closing", () => {
		const result = applyStatementCredits(
			[
				statement("september", "2026-09-04", 278.98, 3166.82),
				statement("october", "2026-10-04", 248, 0),
				statement("november", "2026-11-04", 248, 0),
			],
			"2026-09-04",
		);

		expect(result).toEqual([
			expect.objectContaining({ balanceAmount: 0, id: "september", isPaid: true }),
			expect.objectContaining({ balanceAmount: -2639.84, id: "october", isPaid: false }),
			expect.objectContaining({ balanceAmount: -2391.84, id: "november", isPaid: false }),
		]);
	});
});
