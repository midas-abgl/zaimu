import type { DateRangeValue } from "./types";

export type DateRangeBoundary = "end" | "start";

export function selectDateRangeBoundary(
	currentRange: DateRangeValue,
	boundary: DateRangeBoundary,
	selectedDate: string,
): DateRangeValue {
	if (boundary === "start") {
		return {
			endDate: currentRange.endDate && selectedDate > currentRange.endDate ? undefined : currentRange.endDate,
			startDate: selectedDate,
		};
	}

	return {
		endDate: selectedDate,
		startDate:
			currentRange.startDate && currentRange.startDate > selectedDate ? undefined : currentRange.startDate,
	};
}

export function selectDateRangePair(firstDate: string, secondDate: string): DateRangeValue {
	return firstDate <= secondDate
		? { endDate: secondDate, startDate: firstDate }
		: { endDate: firstDate, startDate: secondDate };
}
