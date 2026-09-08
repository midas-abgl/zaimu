import { describe, expect, test } from "bun:test";
import { selectDateRangeBoundary, selectDateRangePair } from "./range-selection";

describe("date range boundary selection", () => {
	test("preserves the end while changing a valid start", () => {
		expect(
			selectDateRangeBoundary({ endDate: "2026-09-30", startDate: "2026-09-01" }, "start", "2026-09-05"),
		).toEqual({ endDate: "2026-09-30", startDate: "2026-09-05" });
	});

	test("preserves the start while changing a valid end", () => {
		expect(
			selectDateRangeBoundary({ endDate: "2026-09-30", startDate: "2026-09-01" }, "end", "2026-09-25"),
		).toEqual({ endDate: "2026-09-25", startDate: "2026-09-01" });
	});

	test("builds a range from two clicks regardless of their order", () => {
		expect(selectDateRangePair("2026-09-01", "2026-09-30")).toEqual({
			endDate: "2026-09-30",
			startDate: "2026-09-01",
		});
		expect(selectDateRangePair("2026-09-30", "2026-09-01")).toEqual({
			endDate: "2026-09-30",
			startDate: "2026-09-01",
		});
	});
});
