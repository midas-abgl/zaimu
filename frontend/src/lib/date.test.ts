import { describe, expect, test } from "bun:test";
import {
	formatLocalDate,
	formatLocalMonthYear,
	formatLocalTime,
	getLocalMonthKey,
	parseLocalDate,
} from "./date";

describe("local date formatting", () => {
	test("preserves the calendar day from a date-only value", () => {
		expect(parseLocalDate("2026-10-20").getDate()).toBe(20);
		expect(formatLocalDate("2026-10-20")).toBe("20/10/2026");
	});

	test("accepts ISO timestamps returned by date columns", () => {
		expect(formatLocalDate("2026-10-20T00:00:00.000Z")).toBe("20/10/2026");
	});

	test("formats invoice reference month and year", () => {
		expect(formatLocalMonthYear("2026-02-20")).toBe("Fev/26");
		expect(formatLocalMonthYear("2026-09-20")).toBe("Set/26");
	});

	test("identifies the reference month without UTC shifts", () => {
		expect(getLocalMonthKey("2026-08-01T00:00:00.000Z")).toBe("2026-08");
		expect(getLocalMonthKey(new Date(2026, 7, 25))).toBe("2026-08");
	});

	test("formats stored times to hours and minutes", () => {
		expect(formatLocalTime("14:35:00")).toBe("14:35");
		expect(formatLocalTime(undefined)).toBeUndefined();
	});
});
