import { afterEach, describe, expect, test } from "bun:test";
import { resetPasswordUrl, verificationUrl } from "./email";

const previousWebUrl = process.env.PUBLIC_WEB_URL;

afterEach(() => {
	if (previousWebUrl === undefined) delete process.env.PUBLIC_WEB_URL;
	else process.env.PUBLIC_WEB_URL = previousWebUrl;
});

describe("links de autenticação", () => {
	test("gera URLs HTTPS web que preservam tokens", () => {
		process.env.PUBLIC_WEB_URL = "https://app.zaimu.com/";
		expect(verificationUrl("a+b/c")).toBe("https://app.zaimu.com/auth/verify-email?token=a%2Bb%2Fc");
		expect(resetPasswordUrl("token único")).toBe(
			"https://app.zaimu.com/auth/reset-password?token=token%20%C3%BAnico",
		);
	});
});
