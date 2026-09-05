import { expect, test } from "bun:test";
import type { DebtEvent } from "@/lib/api";
import { compareDebtEventsByDateThenLabel, getDebtEventLabel } from "./debt-event";

const event = (id: string, date: string, description: string): DebtEvent => ({
	amount: 1,
	createdByMe: true,
	createdByName: "Você",
	createdByUserId: "user-id",
	date,
	description,
	effect: -1,
	id,
	kind: "TRANSACTION",
});

test("ordena lançamentos da dívida por data e descrição em caso de empate", () => {
	const events = [
		event("iphone", "2026-09-01", "iPhone 17"),
		event("abafador", "2026-09-01", "Abafador de ruído"),
		event("água", "2026-08-03", "Água"),
	];

	expect(events.toSorted(compareDebtEventsByDateThenLabel).map(getDebtEventLabel)).toEqual([
		"Abafador de ruído",
		"iPhone 17",
		"Água",
	]);
});
