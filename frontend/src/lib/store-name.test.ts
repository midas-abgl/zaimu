import { expect, test } from "bun:test";
import { getUpdatedStoreName } from "./store-name";

test("preserves a store when it was not changed", () => {
	expect(getUpdatedStoreName("Supermercado", "Supermercado")).toBeUndefined();
});

test("returns the new store name after trimming it", () => {
	expect(getUpdatedStoreName("Supermercado", " Feira ")).toBe("Feira");
});

test("returns null when clearing an existing store", () => {
	expect(getUpdatedStoreName("Supermercado", "")).toBeNull();
});
