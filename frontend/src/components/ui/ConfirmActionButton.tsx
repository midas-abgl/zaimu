import { type ComponentProps, type ReactNode, useEffect, useState } from "react";
import { LuCheck } from "react-icons/lu";
import { Button } from "./Button";

export function ConfirmActionButton({
	confirmation = "Confirmar ação?",
	confirmChildren,
	onConfirm,
	...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
	confirmation?: string;
	confirmChildren?: ReactNode;
	onConfirm: () => void | Promise<void>;
}) {
	const [confirming, setConfirming] = useState(false);
	const isIconButton = props.size?.startsWith("icon");
	const confirmationContent = confirmChildren ?? (isIconButton ? <LuCheck /> : "Confirmar");
	useEffect(() => {
		if (!confirming) return;
		const timeout = window.setTimeout(() => setConfirming(false), 3000);
		return () => window.clearTimeout(timeout);
	}, [confirming]);
	return (
		<div className="relative inline-flex">
			{confirming && (
				<span className="absolute right-0 bottom-full z-20 mb-2 w-max max-w-52 rounded-lg border bg-popover px-3 py-2 text-popover-foreground text-xs shadow-card">
					{confirmation}
				</span>
			)}
			<Button
				{...props}
				aria-label={confirming ? confirmation : props["aria-label"]}
				onClick={() => (confirming ? void onConfirm() : setConfirming(true))}
			>
				{confirming ? confirmationContent : props.children}
			</Button>
		</div>
	);
}
