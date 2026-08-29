import { Badge } from "@/components/ui/Badge";
import type { Tag } from "@/lib/api";

export function TransactionTags({ fallback, tags }: { fallback?: Tag; tags?: Tag[] }) {
	const visibleTags = tags?.length ? tags : fallback ? [fallback] : [];

	if (!visibleTags.length) return null;

	return (
		<ul aria-label="Tags" className="mt-1.5 flex min-w-0 list-none flex-wrap gap-1">
			{visibleTags.map(tag => (
				<li className="min-w-0" key={tag.id}>
					<Badge className="h-6 max-w-44" variant="secondary">
						<span
							aria-hidden="true"
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: tag.color || "var(--primary)" }}
						/>
						<span className="truncate">{tag.name}</span>
					</Badge>
				</li>
			))}
		</ul>
	);
}
