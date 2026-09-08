import { describe, expect, test } from "bun:test";
import { getNextActiveBoundary, selectDateRangeBoundary } from "./range-selection";

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

	test("only switches boundary while completing a one-sided range", () => {
		expect(getNextActiveBoundary({ startDate: "2026-09-01" }, "start")).toBe("end");
		expect(getNextActiveBoundary({ endDate: "2026-09-30" }, "end")).toBe("start");
		expect(getNextActiveBoundary({ endDate: "2026-09-30", startDate: "2026-09-01" }, "start")).toBe("start");
		expect(getNextActiveBoundary({ endDate: "2026-09-30", startDate: "2026-09-01" }, "end")).toBe("end");
	});
});
