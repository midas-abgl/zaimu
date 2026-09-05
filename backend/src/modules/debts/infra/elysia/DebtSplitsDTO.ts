import { t } from "elysia";

const Id = t.String({ maxLength: 36, minLength: 1 });
const SharesParticipant = t.Object({ debtPersonId: Id, shares: t.Integer({ minimum: 1 }) });
const PercentageParticipant = t.Object({
	debtPersonId: Id,
	percentage: t.Number({ exclusiveMinimum: 0, maximum: 100 }),
});
const FixedParticipant = t.Object({ debtPersonId: Id, fixedAmount: t.Number({ exclusiveMinimum: 0 }) });

export const DebtSplitInputDTO = t.Union([
	t.Object({
		mode: t.Literal("SHARES"),
		ownerShares: t.Union([t.Integer({ minimum: 1 }), t.Null()]),
		participants: t.Array(SharesParticipant, { minItems: 1 }),
	}),
	t.Object({
		mode: t.Literal("PERCENTAGE"),
		ownerIncluded: t.Boolean(),
		participants: t.Array(PercentageParticipant, { minItems: 1 }),
	}),
	t.Object({
		mode: t.Literal("FIXED"),
		ownerIncluded: t.Boolean(),
		participants: t.Array(FixedParticipant, { minItems: 1 }),
	}),
]);
export type DebtSplitInputDTO = typeof DebtSplitInputDTO.static;

const SharesParticipantReturn = t.Object({
	...SharesParticipant.properties,
	amount: t.Number(),
	debtPersonName: t.String(),
});
const PercentageParticipantReturn = t.Object({
	...PercentageParticipant.properties,
	amount: t.Number(),
	debtPersonName: t.String(),
});
const FixedParticipantReturn = t.Object({
	...FixedParticipant.properties,
	amount: t.Number(),
	debtPersonName: t.String(),
});

export const DebtSplitReturnDTO = t.Union([
	t.Object({
		mode: t.Literal("SHARES"),
		ownerAmount: t.Number(),
		ownerShares: t.Union([t.Integer(), t.Null()]),
		participants: t.Array(SharesParticipantReturn),
	}),
	t.Object({
		mode: t.Literal("PERCENTAGE"),
		ownerAmount: t.Number(),
		ownerIncluded: t.Boolean(),
		participants: t.Array(PercentageParticipantReturn),
	}),
	t.Object({
		mode: t.Literal("FIXED"),
		ownerAmount: t.Number(),
		ownerIncluded: t.Boolean(),
		participants: t.Array(FixedParticipantReturn),
	}),
]);
export type DebtSplitReturnDTO = typeof DebtSplitReturnDTO.static;
