import type { RecurringDraft, RecurringSource } from "./types";

export function getCreationSource({
	paymentMethod,
	source,
}: Pick<RecurringDraft, "paymentMethod" | "source">) {
	if (source === "recurring" && paymentMethod === "CREDIT") return "subscription" satisfies RecurringSource;
	return source;
}
