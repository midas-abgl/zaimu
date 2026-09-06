import { LuChevronDown, LuChevronUp, LuEyeOff } from "react-icons/lu";
import { Button } from "@/components/ui/Button";

export function HiddenRecurrencesToggle({
	expanded,
	hiddenCount,
	label,
	onClick,
}: {
	expanded: boolean;
	hiddenCount: number;
	label: string;
	onClick: () => void;
}) {
	const countLabel = `${hiddenCount} ${hiddenCount === 1 ? "recorrência oculta" : "recorrências ocultas"}`;
	const actionLabel = expanded
		? `Minimizar recorrências ${label.toLowerCase()}`
		: `Expandir recorrências ${label.toLowerCase()}`;

	return (
		<Button
			aria-expanded={expanded}
			aria-label={actionLabel}
			className="w-full cursor-pointer justify-between text-muted-foreground hover:text-foreground"
			onClick={onClick}
			variant="outline"
		>
			<span className="flex items-center gap-2">
				<LuEyeOff aria-hidden="true" />
				{label} · {countLabel}
			</span>
			{expanded ? <LuChevronUp aria-hidden="true" /> : <LuChevronDown aria-hidden="true" />}
		</Button>
	);
}
