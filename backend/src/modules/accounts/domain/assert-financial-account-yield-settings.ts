import { HttpException } from "~/shared/errors";

export function assertFinancialAccountYieldSettings(settings: {
	type: string;
	yieldPeriod?: null | string;
	yieldRate?: null | number;
}) {
	const hasRate = settings.yieldRate !== undefined && settings.yieldRate !== null;
	const hasPeriod = settings.yieldPeriod !== undefined && settings.yieldPeriod !== null;
	if (settings.type === "CREDIT_CARD" && (hasRate || hasPeriod))
		throw new HttpException("Cartão de crédito não pode ter rendimento", 400);
	if (hasRate !== hasPeriod) throw new HttpException("Informe a taxa e o período do rendimento juntos", 400);
	if (hasRate && settings.yieldRate! <= 0)
		throw new HttpException("O rendimento deve ser maior que zero", 400);
	if (hasPeriod && settings.yieldPeriod !== "MONTHLY" && settings.yieldPeriod !== "YEARLY")
		throw new HttpException("Selecione um período de rendimento válido", 400);
}
