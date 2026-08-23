import { describe, expect, test } from "bun:test";
import { parseAuthDeepLink } from "./deep-links";

describe("parseAuthDeepLink", () => {
	test.each([
		[
			"https://app.zaimu.com/auth/verify-email?token=email-token",
			{ to: "/auth/verify-email", token: "email-token" },
		],
		["zaimu://auth/reset-password?token=reset-token", { to: "/auth/reset-password", token: "reset-token" }],
	] as const)("interpreta link %s", (url, expected) => {
		expect(parseAuthDeepLink(url)).toEqual(expected);
	});

	test.each([
		"https://app.zaimu.com/auth/reset-password",
		"https://app.zaimu.com/transactions?token=secret",
		"não-é-uma-url",
	])("ignora link inválido %s", url => {
		expect(parseAuthDeepLink(url)).toBeNull();
	});
});
