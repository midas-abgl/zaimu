import { afterEach, describe, expect, test } from "bun:test";
import { authEmailHtml, resetPasswordUrl, verificationUrl } from "./email";

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

describe("identidade dos e-mails de autenticação", () => {
	test("renderiza banner e cores da marca com links absolutos", () => {
		process.env.PUBLIC_WEB_URL = "https://app.zaimu.com/";
		const html = authEmailHtml({
			actionLabel: "Confirmar e-mail",
			preview: "Proteja sua conta.",
			subject: "Confirme seu e-mail",
			url: "https://app.zaimu.com/auth/verify-email?token=a&source=email",
		});

		expect(html).toContain('src="https://app.zaimu.com/brand/zaimu-email-banner.png"');
		expect(html).toContain("background:#4F53B7");
		expect(html).toContain("Confirmar e-mail");
		expect(html).toContain("token=a&amp;source=email");
		expect(html).toContain("Seu dinheiro, sem ruído.");
	});
});
