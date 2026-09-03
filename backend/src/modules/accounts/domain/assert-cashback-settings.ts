import { HttpException } from "~/shared/errors";

export interface CashbackSettings {
	cashbackAccountId?: null | string;
	cashbackRate?: null | number;
	cashbackYieldPeriod?: null | string;
	cashbackYieldRate?: null | number;
	cashbackRewards?: unknown;
}

export function assertCashbackSettings(settings: CashbackSettings) {
	const rate = settings.cashbackRate ?? 0;
	if (rate < 0) throw new HttpException("A recompensa não pode ser negativa", 400);

	const hasYieldRate = settings.cashbackYieldRate !== undefined && settings.cashbackYieldRate !== null;
	const hasYieldPeriod = settings.cashbackYieldPeriod !== undefined && settings.cashbackYieldPeriod !== null;
	if (
		settings.cashbackYieldPeriod !== undefined &&
		settings.cashbackYieldPeriod !== null &&
		settings.cashbackYieldPeriod !== "MONTHLY" &&
		settings.cashbackYieldPeriod !== "YEARLY"
	)
		throw new HttpException("Selecione um período de rendimento válido", 400);
	if (hasYieldRate !== hasYieldPeriod)
		throw new HttpException("Informe a taxa e o período do rendimento juntos", 400);
	if (hasYieldRate && settings.cashbackYieldRate! <= 0)
		throw new HttpException("O rendimento deve ser maior que zero", 400);
	if (rate === 0 && (hasYieldRate || hasYieldPeriod))
		throw new HttpException("Rendimento exige cashback ativo", 400);
}
