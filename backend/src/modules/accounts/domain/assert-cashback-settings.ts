import { HttpException } from "~/shared/errors";

export interface CashbackSettings {
	cashbackAccountId?: null | string;
	cashbackRate?: null | number;
	cashbackYieldPeriod?: null | string;
	cashbackYieldReferencePercentage?: null | number;
	cashbackYieldReferenceRate?: null | number;
	cashbackRewards?: unknown;
}

export function assertCashbackSettings(settings: CashbackSettings) {
	const rate = settings.cashbackRate ?? 0;
	if (rate < 0) throw new HttpException("A recompensa não pode ser negativa", 400);

	const hasYieldPercentage =
		settings.cashbackYieldReferencePercentage !== undefined &&
		settings.cashbackYieldReferencePercentage !== null;
	const hasYieldRate =
		settings.cashbackYieldReferenceRate !== undefined && settings.cashbackYieldReferenceRate !== null;
	const hasYieldPeriod = settings.cashbackYieldPeriod !== undefined && settings.cashbackYieldPeriod !== null;
	if (
		settings.cashbackYieldPeriod !== undefined &&
		settings.cashbackYieldPeriod !== null &&
		settings.cashbackYieldPeriod !== "MONTHLY" &&
		settings.cashbackYieldPeriod !== "YEARLY"
	)
		throw new HttpException("Selecione um período de rendimento válido", 400);
	if (hasYieldRate !== hasYieldPercentage || hasYieldRate !== hasYieldPeriod)
		throw new HttpException("Informe a referência, o percentual e o período do rendimento juntos", 400);
	if (
		(hasYieldRate && settings.cashbackYieldReferenceRate! <= 0) ||
		(hasYieldPercentage && settings.cashbackYieldReferencePercentage! <= 0)
	)
		throw new HttpException("As taxas do rendimento devem ser maiores que zero", 400);
	if (rate === 0 && (hasYieldRate || hasYieldPercentage || hasYieldPeriod))
		throw new HttpException("Rendimento exige cashback ativo", 400);
}
