import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type SyntheticEvent, useState } from "react";
import { LuArrowRight, LuMail, LuUserRound } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import { useAuthStore } from "@/stores";
import { AuthAlert, AuthShell, PasswordField } from "./components";

function RegisterPage() {
	const navigate = useNavigate();
	const { clearError, error, isLoading, register } = useAuthStore();
	const [name, setName] = useDebouncedInput("", clearError);
	const [email, setEmail] = useDebouncedInput("", clearError);
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [validationError, setValidationError] = useState<string | null>(null);

	const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		setValidationError(null);
		if (name.trim().length < 2) return setValidationError("Informe seu nome completo.");
		if (password.length < 8) return setValidationError("A senha precisa ter pelo menos 8 caracteres.");
		if (password !== confirmation) return setValidationError("As senhas não coincidem.");
		if (!(await register(name.trim(), email.trim(), password))) return;
		await navigate({ search: { sent: email.trim() }, to: "/auth/verify-email" });
	};

	return (
		<AuthShell
			description="Crie sua conta para sincronizar cartões, compras e demais dados entre dispositivos."
			title="Comece seu controle financeiro"
		>
			<form className="grid gap-5" onSubmit={handleSubmit}>
				{(error || validationError) && <AuthAlert message={error || validationError || ""} />}
				<FormField
					autoComplete="name"
					id="name"
					label="Nome"
					leading={<LuUserRound className="size-4" />}
					name="name"
					onChange={event => setName(event.currentTarget.value)}
					placeholder="Ex: Marina Souza"
					required
					type="text"
					value={name}
				/>
				<FormField
					autoComplete="email"
					id="email"
					label="E-mail"
					leading={<LuMail className="size-4" />}
					name="email"
					onChange={event => setEmail(event.currentTarget.value)}
					placeholder="marina@exemplo.com"
					required
					type="email"
					value={email}
				/>
				<PasswordField
					autoComplete="new-password"
					description="Use pelo menos 8 caracteres."
					id="password"
					label="Senha"
					onChange={setPassword}
					placeholder="Crie uma senha segura"
					value={password}
				/>
				<PasswordField
					autoComplete="new-password"
					id="password-confirmation"
					label="Confirmar senha"
					onChange={setConfirmation}
					placeholder="Digite a senha novamente"
					value={confirmation}
				/>
				<Button className="h-11 w-full" disabled={isLoading} size="lg" type="submit">
					{isLoading ? "Criando…" : "Criar conta"} <LuArrowRight />
				</Button>
			</form>
			<p className="mt-6 text-center text-muted-foreground text-sm">
				Já tem conta?{" "}
				<Link className="font-semibold text-primary hover:underline" to="/auth">
					Entrar
				</Link>
			</p>
		</AuthShell>
	);
}

export const Route = createFileRoute("/auth/register")({ component: RegisterPage });
