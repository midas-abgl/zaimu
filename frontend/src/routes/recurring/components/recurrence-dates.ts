import { addDays, addMonths, addWeeks, addYears, format, isBefore, parseISO, startOfDay } from "date-fns";
import type { RecurrenceFrequency } from "./types";

export function getPastRecurrenceDates(
	frequency: RecurrenceFrequency,
	startDate: string,
	today = new Date(),
): string[] {
	const dates: string[] = [];
	const cutoff = startOfDay(today);
	let occurrence = startOfDay(parseISO(startDate));

	while (isBefore(occurrence, cutoff)) {
		dates.push(format(occurrence, "yyyy-MM-dd"));
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

	return dates;
}
