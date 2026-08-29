import { describe, expect, test } from "bun:test";
import { getPastRecurrenceDates } from "./recurrence-dates";

describe("getPastRecurrenceDates", () => {
	test("returns each past monthly occurrence and excludes today", () => {
		expect(getPastRecurrenceDates("MONTHLY", "2026-01-04", new Date("2026-08-28T12:00:00"))).toEqual([
			"2026-01-04",
			"2026-02-04",
			"2026-03-04",
			"2026-04-04",
			"2026-05-04",
			"2026-06-04",
			"2026-07-04",
			"2026-08-04",
		]);
	});

	test("returns no dates when recurrence starts today", () => {
		expect(getPastRecurrenceDates("DAILY", "2026-08-28", new Date("2026-08-28T12:00:00"))).toEqual([]);
	});
});
