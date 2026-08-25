const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}/;

export function parseLocalDate(value: string): Date {
	const dateOnly = value.match(dateOnlyPattern)?.[0];
	return new Date(dateOnly ? `${dateOnly}T12:00:00` : value);
}

export function formatLocalDate(value: string, options?: Intl.DateTimeFormatOptions): string {
	return parseLocalDate(value).toLocaleDateString("pt-BR", options);
}
