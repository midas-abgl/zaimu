import { describe, expect, test } from "bun:test";
import { sortTransactionsByMostRecent } from "./transaction-sort";

describe("sortTransactionsByMostRecent", () => {
	test("sorts dates and times from most recent to oldest", () => {
		const transactions = sortTransactionsByMostRecent([
			{ createdAt: "2026-09-08T12:30:00Z", date: "2026-09-08", id: "morning", time: "12:30" },
			{ createdAt: "2026-09-07T18:00:00Z", date: "2026-09-07", id: "previous-day", time: "18:00" },
			{ createdAt: "2026-09-08T15:33:00Z", date: "2026-09-08", id: "afternoon", time: "15:33" },
			{ createdAt: "2026-09-08T12:54:00Z", date: "2026-09-08", id: "lunch", time: "12:54" },
		]);

		expect(transactions.map(transaction => transaction.id)).toEqual([
			"afternoon",
			"lunch",
			"morning",
			"previous-day",
		]);
	});

	test("uses creation date when date and time match", () => {
		const transactions = sortTransactionsByMostRecent([
			{ createdAt: "2026-09-08T12:30:00Z", date: "2026-09-08", id: "older", time: "12:30" },
			{ createdAt: "2026-09-08T12:31:00Z", date: "2026-09-08", id: "newer", time: "12:30" },
		]);

		expect(transactions.map(transaction => transaction.id)).toEqual(["newer", "older"]);
	});
});
