import { describe, expect, test } from "bun:test";
import { getPastRecurrenceDates } from "./recurrence-dates";

describe("getPastRecurrenceDates", () => {
	test("returns each past monthly occurrence and excludes today", () => {
		expect(getPastRecurrenceDates("MONTHLY", "2026-01-04", 3, new Date("2026-08-28T12:00:00"))).toEqual([
			"2026-01-03",
			"2026-02-03",
			"2026-03-03",
			"2026-04-03",
			"2026-05-03",
			"2026-06-03",
			"2026-07-03",
			"2026-08-03",
		]);
	});

	test("returns no dates when recurrence starts today", () => {
		expect(getPastRecurrenceDates("DAILY", "2026-08-28", undefined, new Date("2026-08-28T12:00:00"))).toEqual(
			[],
		);
	});

	test("clamps monthly payments to the last valid day without drifting", () => {
		expect(getPastRecurrenceDates("MONTHLY", "2026-01-31", 31, new Date("2026-04-01T12:00:00"))).toEqual([
			"2026-01-31",
			"2026-02-28",
			"2026-03-31",
		]);
	});
});
