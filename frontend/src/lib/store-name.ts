export function getUpdatedStoreName(
	current: string | null | undefined,
	next: string | null | undefined,
): string | null | undefined {
	const normalizedCurrent = current?.trim() || null;
	const normalizedNext = next?.trim() || null;

	return normalizedCurrent === normalizedNext ? undefined : normalizedNext;
}
