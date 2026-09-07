import { describe, expect, test } from "bun:test";
import { getCreationSource } from "./creation-source";

describe("getCreationSource", () => {
	test("stores credit-card recurring payments as subscriptions", () => {
		expect(getCreationSource({ paymentMethod: "CREDIT", source: "recurring" })).toBe("subscription");
	});

	test("preserves other recurrence sources and payment methods", () => {
		expect(getCreationSource({ paymentMethod: "DEBIT", source: "recurring" })).toBe("recurring");
		expect(getCreationSource({ paymentMethod: "CREDIT", source: "subscription" })).toBe("subscription");
		expect(getCreationSource({ paymentMethod: "CREDIT", source: "salary" })).toBe("salary");
	});
});
