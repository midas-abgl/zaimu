import type { ReactNode } from "react";

export function PageHeader({
	actions,
	description,
	eyebrow,
	title,
}: {
	actions?: ReactNode;
	description?: string;
	eyebrow?: string;
	title: string;
}) {
	return (
		<header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0">
				{eyebrow && (
					<p className="mb-1 font-bold text-primary text-xs uppercase tracking-[0.16em]">{eyebrow}</p>
				)}
				<h1 className="break-words font-bold text-3xl tracking-tight sm:text-4xl">{title}</h1>
				{description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
			</div>
			{actions && (
				<div className="flex w-full shrink-0 items-center gap-2 sm:w-auto [&>*]:w-full sm:[&>*]:w-auto">
					{actions}
				</div>
			)}
		</header>
	);
}
