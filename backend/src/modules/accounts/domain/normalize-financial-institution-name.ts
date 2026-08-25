export function normalizeFinancialInstitutionName(input: string) {
	const name = input.normalize("NFKC").trim().replace(/\s+/gu, " ");
	return { name, normalizedName: name.toLocaleLowerCase("pt-BR") };
}
