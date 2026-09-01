const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}/;
const timePattern = /T?(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

export function parseLocalDate(value: string): Date {
	const dateOnly = value.match(dateOnlyPattern)?.[0];
	return new Date(dateOnly ? `${dateOnly}T12:00:00` : value);
}

export function formatLocalDate(value: string, options?: Intl.DateTimeFormatOptions): string {
	return parseLocalDate(value).toLocaleDateString("pt-BR", options);
}

export function getLocalMonthKey(value: Date | string): string {
	const date = typeof value === "string" ? parseLocalDate(value) : value;
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getCurrentLocalTime(): string {
	const now = new Date();
	return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function formatLocalTime(value: string | null | undefined): string | undefined {
	const time = value?.match(timePattern)?.[1];
	return time;
}
