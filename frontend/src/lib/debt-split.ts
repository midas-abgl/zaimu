import type { DebtSplit, DebtSplitInput } from "./api";

const cents = (value: number) => Math.round(value * 100);
const money = (value: number) => value / 100;

export function calculateDebtSplit(amount: number, split: DebtSplitInput): DebtSplit | null {
	const total = cents(amount);
	if (total <= 0 || split.participants.length === 0) return null;
	if (new Set(split.participants.map(item => item.debtPersonId)).size !== split.participants.length)
		return null;
	let amounts: number[];
	let owner = 0;
	if (split.mode === "SHARES") {
		const values = split.participants.map(item => item.shares);
		if (values.some(value => !Number.isInteger(value) || value < 1)) return null;
		const denominator = values.reduce((sum, value) => sum + value, split.ownerShares ?? 0);
		amounts = values.map(value => Math.floor((total * value) / denominator));
		let remainder = total - amounts.reduce((sum, value) => sum + value, 0);
		if (split.ownerShares === null) {
			const order = values
				.map((value, index) => ({ index, remainder: (total * value) % denominator }))
				.toSorted((left, right) => right.remainder - left.remainder || left.index - right.index);
			for (let index = 0; remainder > 0; index++, remainder--) amounts[order[index % order.length].index]++;
		} else owner = remainder;
	} else if (split.mode === "PERCENTAGE") {
		const values = split.participants.map(item => Math.round(item.percentage * 100));
		const sum = values.reduce((result, value) => result + value, 0);
		if (
			split.participants.some(
				(item, index) =>
					!Number.isFinite(item.percentage) ||
					item.percentage <= 0 ||
					Math.abs(item.percentage * 100 - values[index]) > 1e-7,
			) ||
			(split.ownerIncluded ? sum >= 10_000 : sum !== 10_000)
		)
			return null;
		amounts = values.map(value => Math.floor((total * value) / 10_000));
		let remainder = total - amounts.reduce((result, value) => result + value, 0);
		if (split.ownerIncluded) owner = remainder;
		else {
			const order = values
				.map((value, index) => ({ index, remainder: (total * value) % 10_000 }))
				.toSorted((left, right) => right.remainder - left.remainder || left.index - right.index);
			for (let index = 0; remainder > 0; index++, remainder--) amounts[order[index % order.length].index]++;
		}
	} else {
		amounts = split.participants.map(item => cents(item.fixedAmount));
		const sum = amounts.reduce((result, value) => result + value, 0);
		if (
			split.participants.some(
				(item, index) =>
					!Number.isFinite(item.fixedAmount) ||
					item.fixedAmount <= 0 ||
					Math.abs(item.fixedAmount * 100 - amounts[index]) > 1e-7,
			) ||
			(split.ownerIncluded ? sum >= total : sum !== total)
		)
			return null;
		owner = total - sum;
	}
	if (
		amounts.some(value => value < 1) ||
		((split.mode === "SHARES" ? split.ownerShares !== null : split.ownerIncluded) && owner < 1)
	)
		return null;
	return {
		...split,
		ownerAmount: money(owner),
		participants: split.participants.map((participant, index) => ({
			...participant,
			amount: money(amounts[index]),
			debtPersonName: "",
		})),
	} as DebtSplit;
}

export function debtSplitError(amount: number, split: DebtSplitInput): string | null {
	if (split.participants.some(item => !item.debtPersonId)) return "Selecione todas as pessoas.";
	if (new Set(split.participants.map(item => item.debtPersonId)).size !== split.participants.length)
		return "Cada pessoa pode aparecer uma vez.";
	if (calculateDebtSplit(amount, split)) return null;
	if (split.mode === "PERCENTAGE")
		return split.ownerIncluded
			? "Distribua menos de 100%; o restante será sua parte."
			: "Distribua exatamente 100%.";
	if (split.mode === "FIXED")
		return split.ownerIncluded
			? "Distribua menos que o total; o restante será sua parte."
			: "Distribua exatamente o total.";
	return "Use cotas inteiras positivas e garanta ao menos R$ 0,01 por pessoa.";
}

export function debtSplitToInput(split?: DebtSplit | null): DebtSplitInput {
	if (!split)
		return {
			mode: "SHARES",
			ownerShares: null,
			participants: [{ debtPersonId: "", shares: 1 }],
		};
	if (split.mode === "SHARES")
		return {
			mode: split.mode,
			ownerShares: split.ownerShares,
			participants: split.participants.map(({ debtPersonId, shares }) => ({ debtPersonId, shares })),
		};
	if (split.mode === "PERCENTAGE")
		return {
			mode: split.mode,
			ownerIncluded: split.ownerIncluded,
			participants: split.participants.map(({ debtPersonId, percentage }) => ({ debtPersonId, percentage })),
		};
	return {
		mode: split.mode,
		ownerIncluded: split.ownerIncluded,
		participants: split.participants.map(({ debtPersonId, fixedAmount }) => ({ debtPersonId, fixedAmount })),
	};
}
