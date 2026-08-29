import { expect, test } from "bun:test";
import { normalizeStoreName } from "./normalize-store-name";

test("normalizes whitespace and casing for a store name", () => {
	expect(normalizeStoreName("  Supermercado   São José  ")).toEqual({
		name: "Supermercado São José",
		normalizedName: "supermercado são josé",
	});
});
