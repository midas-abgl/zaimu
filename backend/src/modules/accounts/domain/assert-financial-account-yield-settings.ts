import { HttpException } from "~/shared/errors";

export function assertFinancialAccountYieldSettings(settings: {
	type: string;
	yieldFixedRate?: null | number;
	yieldPeriod?: null | string;
	yieldReferencePercentage?: null | number;
	yieldReferenceRate?: null | number;
	yieldTaxRate?: null | number;
}) {
	const hasFixedRate = settings.yieldFixedRate !== undefined && settings.yieldFixedRate !== null;
	const hasPeriod = settings.yieldPeriod !== undefined && settings.yieldPeriod !== null;
	const hasReferencePercentage =
		settings.yieldReferencePercentage !== undefined && settings.yieldReferencePercentage !== null;
	const hasReferenceRate = settings.yieldReferenceRate !== undefined && settings.yieldReferenceRate !== null;
	const hasTaxRate = settings.yieldTaxRate !== undefined && settings.yieldTaxRate !== null;
	const hasYield = hasFixedRate || hasReferencePercentage || hasReferenceRate;
	if (settings.type === "CREDIT_CARD" && (hasYield || hasPeriod || hasTaxRate))
		throw new HttpException("Cartão de crédito não pode ter rendimento", 400);
	if (hasYield !== hasPeriod)
		throw new HttpException("Informe as taxas e o período do rendimento juntos", 400);
	if (hasReferenceRate !== hasReferencePercentage)
		throw new HttpException("Informe a taxa de referência e o percentual juntos", 400);
	if (hasTaxRate && !hasYield)
		throw new HttpException("Informe a alíquota de imposto junto com as taxas do rendimento", 400);
	if (
		(hasFixedRate && settings.yieldFixedRate! <= 0) ||
		(hasReferenceRate && settings.yieldReferenceRate! <= 0) ||
		(hasReferencePercentage && settings.yieldReferencePercentage! <= 0)
	)
		throw new HttpException("As taxas do rendimento devem ser maiores que zero", 400);
	if (hasTaxRate && (settings.yieldTaxRate! < 0 || settings.yieldTaxRate! > 100))
		throw new HttpException("A alíquota de imposto deve estar entre 0% e 100%", 400);
	if (hasPeriod && settings.yieldPeriod !== "MONTHLY" && settings.yieldPeriod !== "YEARLY")
		throw new HttpException("Selecione um período de rendimento válido", 400);
}
