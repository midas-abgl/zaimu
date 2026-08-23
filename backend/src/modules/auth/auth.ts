import { betterAuth } from "better-auth";
import { pool } from "~/shared/infra/sql";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { hashPassword, verifyPassword } from "./password";

const publicWebUrl = (process.env.PUBLIC_WEB_URL ?? "http://localhost:5173").replace(/\/$/, "");
const apiUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3333").replace(/\/$/, "");

export const auth = betterAuth({
	appName: "Zaimu",
	basePath: "/api/auth",
	baseURL: apiUrl,
	database: pool,
	emailAndPassword: {
		autoSignIn: false,
		enabled: true,
		minPasswordLength: 8,
		password: {
			hash: hashPassword,
			verify: verifyPassword,
		},
		requireEmailVerification: true,
		resetPasswordTokenExpiresIn: 60 * 60,
		revokeSessionsOnPasswordReset: true,
		sendResetPassword: ({ token, user }) => sendPasswordResetEmail(user.email, token),
	},
	emailVerification: {
		autoSignInAfterVerification: false,
		expiresIn: 60 * 60 * 24,
		sendOnSignIn: true,
		sendOnSignUp: true,
		sendVerificationEmail: ({ token, user }) => sendVerificationEmail(user.email, token),
	},
	rateLimit: {
		enabled: true,
		max: 100,
		window: 60,
	},
	secret: process.env.BETTER_AUTH_SECRET,
	trustedOrigins: [publicWebUrl, "tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"],
});

export type AuthSession = typeof auth.$Infer.Session;
