import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";

export interface ItemAction {
	ariaLabel?: string;
	color?: ComponentProps<typeof Button>["variant"];
	confirmation?: string;
	confirmIcon?: ReactNode;
	disabled?: boolean;
	icon: ReactNode;
	onClick?: () => void;
	onConfirm?: () => void | Promise<void>;
	text: string;
}

export function ItemActions({
	actions,
	forceCompact = false,
}: {
	actions: ItemAction[];
	forceCompact?: boolean;
}) {
	const compact = forceCompact || actions.length >= 3;

	return (
		<>
			{actions.map(action => {
				const confirmationContent = compact ? (
					(action.confirmIcon ?? action.icon)
				) : (
					<>{action.confirmIcon ?? action.icon} Confirmar</>
				);
				const content = (
					<>
						{action.icon}
						{compact ? null : ` ${action.text}`}
					</>
				);
				const control = action.onConfirm ? (
					<ConfirmActionButton
						aria-label={action.ariaLabel ?? action.text}
						className="cursor-pointer disabled:cursor-not-allowed"
						confirmation={action.confirmation}
						confirmChildren={confirmationContent}
						disabled={action.disabled}
						onConfirm={action.onConfirm}
						size={compact ? "icon-sm" : "sm"}
						variant={action.color ?? "outline"}
					>
						{content}
					</ConfirmActionButton>
				) : (
					<Button
						aria-label={action.ariaLabel ?? action.text}
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={action.disabled}
						onClick={action.onClick}
						size={compact ? "icon-sm" : "sm"}
						variant={action.color ?? "outline"}
					>
						{content}
					</Button>
				);

				return compact ? (
					<Tooltip key={action.text}>
						<TooltipTrigger asChild>
							<span>{control}</span>
						</TooltipTrigger>
						<TooltipContent>{action.text}</TooltipContent>
					</Tooltip>
				) : (
					<span key={action.text}>{control}</span>
				);
			})}
		</>
	);
}
