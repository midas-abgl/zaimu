import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import {
	HiArrowRight,
	HiDevicePhoneMobile,
	HiEnvelope,
	HiEye,
	HiEyeSlash,
	HiLockClosed,
	HiUser,
} from "react-icons/hi2";
import { dataService } from "@/lib/dataService";
import { useAuthStore } from "@/stores";

type AuthMode = "login" | "register";

function AuthPage() {
	const navigate = useNavigate();
	const { login, register, enableGuestMode, isLoading, error, clearError } = useAuthStore();

	const [mode, setMode] = useState<AuthMode>("login");
	const [showPassword, setShowPassword] = useState(false);
	const [formData, setFormData] = useState({
		confirmPassword: "",
		email: "",
		name: "",
		password: "",
	});
	const [validationError, setValidationError] = useState<string | null>(null);

	const handleInputChange = (field: string, value: string) => {
		setFormData(prev => ({ ...prev, [field]: value }));
		setValidationError(null);
		clearError();
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setValidationError(null);

		// Validation
		if (!formData.email || !formData.password) {
			setValidationError("Please fill in all required fields");
			return;
		}

		if (mode === "register") {
			if (formData.password.length < 8) {
				setValidationError("Password must be at least 8 characters");
				return;
			}
			if (formData.password !== formData.confirmPassword) {
				setValidationError("Passwords do not match");
				return;
			}
		}

		let success: boolean;
		if (mode === "login") {
			success = await login(formData.email, formData.password);
		} else {
			success = await register(formData.email, formData.password, formData.name || undefined);
		}

		if (success) {
			// Sync local data with server after login/register
			await dataService.sync.syncAll();
			navigate({ to: "/" });
		}
	};

	const handleGuestMode = () => {
		enableGuestMode();
		navigate({ to: "/" });
	};

	const toggleMode = () => {
		setMode(mode === "login" ? "register" : "login");
		setFormData({ confirmPassword: "", email: "", name: "", password: "" });
		setValidationError(null);
		clearError();
	};

	return (
		<div className="flex min-h-screen flex-col bg-background">
			{/* Header with gradient */}
			<div className="gradient-primary relative overflow-hidden px-6 pt-16 pb-24">
				<div className="absolute top-0 right-0 h-64 w-64 translate-x-1/4 -translate-y-1/2 rounded-full bg-white/5" />
				<div className="absolute bottom-0 left-0 h-40 w-40 -translate-x-1/4 translate-y-1/2 rounded-full bg-white/5" />
				<div className="absolute top-1/2 right-1/4 h-20 w-20 rounded-full bg-white/3" />

				<div className="relative z-10 text-center">
					<div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm">
						<span className="text-4xl">💰</span>
					</div>
					<h1 className="font-bold text-3xl text-white">Zaimu</h1>
					<p className="mt-2 text-white/70">Personal Finance Manager</p>
				</div>
			</div>

			{/* Form Card */}
			<div className="-mt-12 flex-1 px-4 pb-8">
				<div className="card animate-fade-in p-6">
					{/* Tabs */}
					<div className="mb-6 flex rounded-xl bg-background-card p-1">
						<button
							className={`flex-1 rounded-lg py-3 font-semibold transition-all ${
								mode === "login"
									? "bg-primary-500 text-white shadow-soft"
									: "text-foreground-secondary hover:text-foreground"
							}`}
							onClick={() => mode !== "login" && toggleMode()}
							type="button"
						>
							Sign In
						</button>
						<button
							className={`flex-1 rounded-lg py-3 font-semibold transition-all ${
								mode === "register"
									? "bg-primary-500 text-white shadow-soft"
									: "text-foreground-secondary hover:text-foreground"
							}`}
							onClick={() => mode !== "register" && toggleMode()}
							type="button"
						>
							Sign Up
						</button>
					</div>

					{/* Error Messages */}
					{(error || validationError) && (
						<div className="mb-4 animate-fade-in rounded-xl border border-danger/20 bg-danger/10 p-4">
							<p className="font-medium text-danger text-sm">{error || validationError}</p>
						</div>
					)}

					{/* Form */}
					<form className="space-y-4" onSubmit={handleSubmit}>
						{mode === "register" && (
							<div className="animate-fade-in space-y-2">
								<label className="font-medium text-foreground-secondary text-sm" htmlFor="name">
									Name (optional)
								</label>
								<div className="relative">
									<HiUser className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-foreground-tertiary" />
									<input
										className="input-field pl-12"
										id="name"
										onChange={e => handleInputChange("name", e.target.value)}
										placeholder="Your name"
										type="text"
										value={formData.name}
									/>
								</div>
							</div>
						)}

						<div className="space-y-2">
							<label className="font-medium text-foreground-secondary text-sm" htmlFor="email">
								Email
							</label>
							<div className="relative">
								<HiEnvelope className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-foreground-tertiary" />
								<input
									className="input-field pl-12"
									id="email"
									onChange={e => handleInputChange("email", e.target.value)}
									placeholder="your@email.com"
									required
									type="email"
									value={formData.email}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<label className="font-medium text-foreground-secondary text-sm" htmlFor="password">
								Password
							</label>
							<div className="relative">
								<HiLockClosed className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-foreground-tertiary" />
								<input
									className="input-field pr-12 pl-12"
									id="password"
									onChange={e => handleInputChange("password", e.target.value)}
									placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
									required
									type={showPassword ? "text" : "password"}
									value={formData.password}
								/>
								<button
									className="absolute top-1/2 right-4 -translate-y-1/2 text-foreground-tertiary transition-colors hover:text-foreground"
									onClick={() => setShowPassword(!showPassword)}
									type="button"
								>
									{showPassword ? <HiEyeSlash className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
								</button>
							</div>
						</div>

						{mode === "register" && (
							<div className="animate-fade-in space-y-2">
								<label className="font-medium text-foreground-secondary text-sm" htmlFor="confirmPassword">
									Confirm Password
								</label>
								<div className="relative">
									<HiLockClosed className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-foreground-tertiary" />
									<input
										className="input-field pl-12"
										id="confirmPassword"
										onChange={e => handleInputChange("confirmPassword", e.target.value)}
										placeholder="Confirm your password"
										required={mode === "register"}
										type={showPassword ? "text" : "password"}
										value={formData.confirmPassword}
									/>
								</div>
							</div>
						)}

						<button
							className="btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={isLoading}
							type="submit"
						>
							{isLoading ? (
								<div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
							) : (
								<>
									{mode === "login" ? "Sign In" : "Create Account"}
									<HiArrowRight className="h-5 w-5" />
								</>
							)}
						</button>
					</form>

					{/* Divider */}
					<div className="my-6 flex items-center gap-4">
						<div className="h-px flex-1 bg-border-light" />
						<span className="text-foreground-tertiary text-sm">or</span>
						<div className="h-px flex-1 bg-border-light" />
					</div>

					{/* Guest Mode */}
					<button
						className="btn-secondary flex w-full items-center justify-center gap-3"
						onClick={handleGuestMode}
						type="button"
					>
						<HiDevicePhoneMobile className="h-5 w-5" />
						<span>Continue as Guest</span>
					</button>

					<p className="mt-4 text-center text-foreground-tertiary text-xs">
						Guest mode stores all data locally on your device.
						<br />
						Create an account to sync across devices.
					</p>
				</div>
			</div>
		</div>
	);
}

export const Route = createFileRoute("/auth")({
	component: AuthPage,
});
