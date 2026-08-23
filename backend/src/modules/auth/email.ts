import nodemailer from "nodemailer";

interface AuthEmail {
	preview: string;
	subject: string;
	text: string;
	to: string;
}

const publicWebUrl = () => (process.env.PUBLIC_WEB_URL ?? "http://localhost:5173").replace(/\/$/, "");

const createTransport = () => {
	if (process.env.NODE_ENV === "test") return nodemailer.createTransport({ jsonTransport: true });

	const host = process.env.SMTP_HOST;
	if (!host) throw new Error("SMTP_HOST is required to send authentication emails");

	return nodemailer.createTransport({
		auth:
			process.env.SMTP_USER && process.env.SMTP_PASSWORD
				? { pass: process.env.SMTP_PASSWORD, user: process.env.SMTP_USER }
				: undefined,
		host,
		port: Number(process.env.SMTP_PORT ?? 587),
		secure: process.env.SMTP_SECURE === "true",
	});
};

const sendAuthEmail = async ({ preview, subject, text, to }: AuthEmail) => {
	const from = process.env.SMTP_FROM ?? "Zaimu <nao-responda@zaimu.app>";
	await createTransport().sendMail({
		from,
		html: `
			<div style="background:#f7f7f5;padding:32px;font-family:Figtree,Arial,sans-serif;color:#242424">
				<div style="max-width:520px;margin:auto;background:#fff;border:1px solid #e7e5e4;border-radius:20px;padding:32px">
					<div style="display:inline-block;background:#FFD866;border-radius:12px;padding:10px 14px;font-weight:800">Zaimu</div>
					<h1 style="font-size:24px;margin:24px 0 8px">${subject}</h1>
					<p style="line-height:1.6;color:#57534e">${preview}</p>
					<a href="${text}" style="display:inline-block;margin-top:16px;background:#4F53B7;color:#fff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:700">Continuar no Zaimu</a>
					<p style="font-size:12px;line-height:1.5;color:#78716c;margin-top:24px;word-break:break-all">Se o botão não funcionar, copie este endereço:<br>${text}</p>
				</div>
			</div>`,
		subject,
		text: `${preview}\n\n${text}`,
		to,
	});
};

export const verificationUrl = (token: string) =>
	`${publicWebUrl()}/auth/verify-email?token=${encodeURIComponent(token)}`;

export const resetPasswordUrl = (token: string) =>
	`${publicWebUrl()}/auth/reset-password?token=${encodeURIComponent(token)}`;

export const sendVerificationEmail = (email: string, token: string) =>
	sendAuthEmail({
		preview: "Confirme seu e-mail para proteger seus dados financeiros e concluir a criação da conta.",
		subject: "Confirme seu e-mail",
		text: verificationUrl(token),
		to: email,
	});

export const sendPasswordResetEmail = (email: string, token: string) =>
	sendAuthEmail({
		preview:
			"Recebemos uma solicitação para redefinir sua senha. Ignore esta mensagem caso não tenha sido você.",
		subject: "Redefina sua senha",
		text: resetPasswordUrl(token),
		to: email,
	});
