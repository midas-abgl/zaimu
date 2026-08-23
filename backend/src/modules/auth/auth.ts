import { betterAuth } from "better-auth/minimal";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email";
import { hashPassword, verifyPassword } from "./password";
import { prismaNextAdapter } from "./prisma-next-adapter";

const publicWebUrl = (process.env.PUBLIC_WEB_URL ?? "http://localhost:5173").replace(/\/$/, "");
const apiUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3333").replace(/\/$/, "");

export const auth = betterAuth({
	account: { modelName: "AuthAccount" },
	appName: "Zaimu",
	basePath: "/api/auth",
	baseURL: apiUrl,
	database: prismaNextAdapter(),
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
	session: { modelName: "Session" },
	trustedOrigins: [publicWebUrl, "tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"],
	user: { modelName: "User" },
	verification: { modelName: "Verification" },
});

export type AuthSession = typeof auth.$Infer.Session;
