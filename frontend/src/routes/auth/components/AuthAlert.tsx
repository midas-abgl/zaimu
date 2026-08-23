import { LuCircleAlert, LuCircleCheck } from "react-icons/lu";

export function AuthAlert({ kind = "error", message }: { kind?: "error" | "success"; message: string }) {
	const Icon = kind === "success" ? LuCircleCheck : LuCircleAlert;
	return (
		<div
			className={
				kind === "success"
					? "flex gap-3 rounded-xl border border-emerald-600/20 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300"
					: "flex gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-destructive"
			}
			role="status"
		>
			<Icon className="mt-0.5 size-5 shrink-0" />
			<p className="text-sm leading-relaxed">{message}</p>
		</div>
	);
}
