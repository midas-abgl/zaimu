import Elysia, { t } from "elysia";
import { assertBalanceAccountOwnership, requireUserId } from "~/modules/auth";
import {
	assertTagOwnership,
	getTagsByEntity,
	replaceEntityTags,
	type TagSummary,
} from "~/modules/categories/application/tag-assignments";
import { resolveStore } from "~/modules/stores/application/resolve-store";
import { HttpException } from "~/shared/errors";
import {
	db,
	executeStatement,
	queryFirst,
	queryRows,
	type SqlExecutor,
	withTransaction,
} from "~/shared/infra/sql";
import { matchesTransferCounterpart } from "../../domain/import-reconciliation";
import { parseMercadoPagoStatement } from "../../domain/mercado-pago";
import { TransactionImportItemReconcileDTO, TransactionImportItemUpdateDTO } from "./TransactionImportsDTO";

const importItemTagEntityType = "TRANSACTION_IMPORT_ITEM";
const reconciliationFields = [
	"amount",
	"date",
	"description",
	"destinationFinancialAccountId",
	"originFinancialAccountId",
	"storeName",
	"tagIds",
	"time",
	"type",
] as const;
const transactionTypes = ["INCOME", "EXPENSE", "TRANSFER"] as const;
const importItemTypes = [...transactionTypes, "YIELD"] as const;
type TransactionType = (typeof transactionTypes)[number];
type ImportItemType = (typeof importItemTypes)[number];

const toDateKey = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
const normalizeText = (value: null | string | undefined) => value?.trim() || null;

interface DuplicateCandidate {
	amount: number;
	createdAt: Date;
	date: Date;
	description: string | null;
	destinationFinancialAccountId: string | null;
	externalId: string | null;
	id: string;
	isHidden: boolean;
	originFinancialAccountId: string | null;
	source: "IMPORT_ITEM" | "TRANSACTION";
	sourceImportId: string | null;
	storeName: string | null;
	time: string | null;
	tagIds: string[];
	tags: TagSummary[];
	type: ImportItemType;
}

async function getImport(userId: string, importId: string) {
	const transactionImport = await queryFirst(
		db.sql.public.TransactionImport.select(
			"id",
			"financialAccountId",
			"provider",
			"status",
			"fileName",
			"periodStart",
			"periodEnd",
			"createdAt",
			"updatedAt",
		)
			.where((fields, functions) =>
				functions.and(functions.eq(fields.id, importId), functions.eq(fields.userId, userId)),
			)
			.limit(1)
			.build(),
	);
	if (!transactionImport) throw new HttpException("Importação não encontrada", 404);
	return transactionImport;
}

async function getPotentialDuplicates(
	financialAccountId: string,
	items: Array<{
		amount: number;
		date: Date;
		destinationFinancialAccountId: string | null;
		externalId: string | null;
		id: string;
		isReconciled?: boolean;
		originFinancialAccountId: string | null;
		type: ImportItemType;
	}>,
) {
	const [transactions, pendingItems] = await Promise.all([
		queryRows(
			db.sql.public.Transaction.select(
				"id",
				"amount",
				"createdAt",
				"date",
				"description",
				"externalId",
				"isHidden",
				"storeName",
				"time",
				"type",
				"originFinancialAccountId",
				"destinationFinancialAccountId",
			)
				.where((fields, functions) =>
					functions.or(
						functions.eq(fields.originFinancialAccountId, financialAccountId),
						functions.eq(fields.destinationFinancialAccountId, financialAccountId),
					),
				)
				.build(),
		),
		queryRows(
			db.sql.public.TransactionImportItem.innerJoin(db.sql.public.TransactionImport, (fields, functions) =>
				functions.eq(fields.TransactionImportItem.transactionImportId, fields.TransactionImport.id),
			)
				.select(fields => ({
					amount: fields.TransactionImportItem.amount,
					createdAt: fields.TransactionImportItem.createdAt,
					date: fields.TransactionImportItem.date,
					description: fields.TransactionImportItem.description,
					destinationFinancialAccountId: fields.TransactionImportItem.destinationFinancialAccountId,
					externalId: fields.TransactionImportItem.externalId,
					id: fields.TransactionImportItem.id,
					isHidden: fields.TransactionImportItem.isHidden,
					isReconciled: fields.TransactionImportItem.isReconciled,
					originFinancialAccountId: fields.TransactionImportItem.originFinancialAccountId,
					storeName: fields.TransactionImportItem.storeName,
					time: fields.TransactionImportItem.time,
					transactionImportId: fields.TransactionImportItem.transactionImportId,
					type: fields.TransactionImportItem.type,
				}))
				.where((fields, functions) =>
					functions.and(
						functions.eq(fields.TransactionImport.status, "PENDING"),
						functions.eq(fields.TransactionImport.financialAccountId, financialAccountId),
					),
				)
				.build(),
		),
	]);

	const [transactionTags, importItemTags] = await Promise.all([
		getTagsByEntity(
			"TRANSACTION",
			transactions.map(transaction => transaction.id),
		),
		getTagsByEntity(
			importItemTagEntityType,
			pendingItems.map(item => item.id),
		),
	]);
	const candidates: DuplicateCandidate[] = [
		...transactions.map(transaction => {
			const tags = transactionTags.get(transaction.id) ?? [];
			return {
				...transaction,
				source: "TRANSACTION" as const,
				sourceImportId: null,
				tagIds: tags.map(tag => tag.id),
				tags,
				type: transaction.type as TransactionType,
			};
		}),
		...pendingItems
			.filter(item => !item.isReconciled)
			.map(item => {
				const tags = importItemTags.get(item.id) ?? [];
				return {
					...item,
					source: "IMPORT_ITEM" as const,
					sourceImportId: item.transactionImportId,
					tagIds: tags.map(tag => tag.id),
					tags,
					type: item.type as ImportItemType,
				};
			}),
	];
	return new Map(
		items.map(item => {
			if (item.isReconciled) return [item.id, null] as const;
			const isSameAccount = (candidate: {
				destinationFinancialAccountId: string | null;
				originFinancialAccountId: string | null;
			}) =>
				candidate.originFinancialAccountId === financialAccountId ||
				candidate.destinationFinancialAccountId === financialAccountId;
			const externalDuplicate = item.externalId
				? candidates.find(
						candidate =>
							candidate.id !== item.id &&
							isSameAccount(candidate) &&
							candidate.externalId === item.externalId,
					)
				: undefined;
			const dateAmountDuplicate = candidates.find(
				candidate =>
					candidate.id !== item.id &&
					isSameAccount(candidate) &&
					(candidate.type === item.type || matchesTransferCounterpart(item, candidate, financialAccountId)) &&
					Number(candidate.amount) === Number(item.amount) &&
					toDateKey(candidate.date) === toDateKey(item.date),
			);
			const duplicate = externalDuplicate ?? dateAmountDuplicate;
			return [
				item.id,
				duplicate
					? { candidate: duplicate, reason: externalDuplicate ? "EXTERNAL_ID" : "DATE_AMOUNT" }
					: null,
			] as const;
		}),
	);
}

async function getImportReturn(userId: string, importId: string) {
	const transactionImport = await getImport(userId, importId);
	const items = await queryRows(
		db.sql.public.TransactionImportItem.select(
			"id",
			"amount",
			"balanceAfter",
			"categoryId",
			"createdAt",
			"date",
			"description",
			"destinationFinancialAccountId",
			"externalId",
			"isHidden",
			"isReconciled",
			"isSelected",
			"originFinancialAccountId",
			"storeName",
			"time",
			"type",
			"updatedAt",
		)
			.where((fields, functions) => functions.eq(fields.transactionImportId, importId))
			.orderBy("date", { direction: "desc" })
			.build(),
	);
	const [tagsByItem, duplicates] = await Promise.all([
		getTagsByEntity(
			importItemTagEntityType,
			items.map(item => item.id),
		),
		getPotentialDuplicates(
			transactionImport.financialAccountId,
			items.map(item => ({ ...item, type: item.type as ImportItemType })),
		),
	]);
	return {
		...transactionImport,
		items: items.map(item => {
			const { externalId: _, ...visibleItem } = item;
			const tags = tagsByItem.get(item.id) ?? [];
			const duplicate = duplicates.get(item.id)?.candidate;
			const { externalId: __, ...visibleDuplicate } = duplicate ?? {};
			return {
				...visibleItem,
				duplicate: duplicate ? visibleDuplicate : null,
				duplicateReason: duplicates.get(item.id)?.reason ?? null,
				tagIds: tags.map(tag => tag.id),
				tags,
			};
		}),
	};
}

async function validateItemAccounts(
	item: {
		destinationFinancialAccountId: string | null;
		originFinancialAccountId: string | null;
		type: ImportItemType;
	},
	userId: string,
) {
	if (item.type === "INCOME" || item.type === "YIELD") {
		if (!item.destinationFinancialAccountId) throw new HttpException("Selecione a conta de destino", 400);
		await assertBalanceAccountOwnership(item.destinationFinancialAccountId, userId);
		return;
	}
	if (!item.originFinancialAccountId) throw new HttpException("Selecione a conta de origem", 400);
	await assertBalanceAccountOwnership(item.originFinancialAccountId, userId);
	if (item.type === "TRANSFER") {
		if (!item.destinationFinancialAccountId) throw new HttpException("Selecione a conta de destino", 400);
		if (item.destinationFinancialAccountId === item.originFinancialAccountId)
			throw new HttpException("Escolha contas diferentes para a transferência", 400);
		await assertBalanceAccountOwnership(item.destinationFinancialAccountId, userId);
	}
}

interface ImportItemToApprove {
	amount: number;
	date: Date;
	description: string | null;
	destinationFinancialAccountId: string | null;
	externalId: string | null;
	id: string;
	isHidden: boolean;
	originFinancialAccountId: string | null;
	storeName: string | null;
	time: string | null;
	type: ImportItemType;
}

async function prepareImportItem(item: ImportItemToApprove, userId: string) {
	await validateItemAccounts(item, userId);
	if (item.storeName && item.type !== "EXPENSE")
		throw new HttpException("Loja só pode ser informada em saídas", 400);
	if (item.storeName) await resolveStore(userId, item.storeName);
	const tags = await getTagsByEntity(importItemTagEntityType, [item.id]);
	return assertTagOwnership(
		(tags.get(item.id) ?? []).map(tag => tag.id),
		userId,
	);
}

async function persistImportItem(transaction: SqlExecutor, item: ImportItemToApprove, tagIds: string[]) {
	if (item.type === "YIELD") {
		const existingYield = await transaction.queryFirst(
			transaction.db.sql.public.FinancialAccountYield.select("id")
				.where((fields, functions) =>
					functions.and(
						functions.eq(fields.financialAccountId, item.destinationFinancialAccountId!),
						functions.eq(fields.date, item.date),
						functions.eq(fields.kind, "MANUAL"),
					),
				)
				.limit(1)
				.build(),
		);
		const yieldValues = { amount: String(item.amount), isExcluded: false, updatedAt: new Date() };
		if (existingYield)
			await transaction.executeStatement(
				transaction.db.sql.public.FinancialAccountYield.update(yieldValues)
					.where((fields, functions) => functions.eq(fields.id, existingYield.id))
					.build(),
			);
		else
			await transaction.executeStatement(
				transaction.db.sql.public.FinancialAccountYield.insert([
					{
						...yieldValues,
						date: item.date,
						financialAccountId: item.destinationFinancialAccountId!,
						kind: "MANUAL",
					},
				]).build(),
			);
		return;
	}

	const importedTransaction = await transaction.queryFirst(
		transaction.db.sql.public.Transaction.insert([
			{
				amount: String(item.amount),
				categoryId: tagIds[0],
				date: item.date,
				description: item.description,
				destinationFinancialAccountId: item.destinationFinancialAccountId,
				externalId: item.externalId,
				isHidden: item.isHidden,
				originFinancialAccountId: item.originFinancialAccountId,
				storeName: item.storeName,
				time: item.time,
				type: item.type as TransactionType,
			},
		])
			.returning("id")
			.build(),
	);
	if (!importedTransaction) throw new HttpException("Não foi possível salvar uma transação importada", 500);
	if (tagIds.length) {
		await transaction.executeStatement(
			transaction.db.sql.public.TagAssignment.insert(
				tagIds.map(categoryId => ({
					categoryId,
					entityId: importedTransaction.id,
					entityType: "TRANSACTION",
				})),
			).build(),
		);
	}
}

async function removeImportItem(transaction: SqlExecutor, itemId: string) {
	await transaction.executeStatement(
		transaction.db.sql.public.TagAssignment.delete()
			.where((fields, functions) =>
				functions.and(
					functions.eq(fields.entityType, importItemTagEntityType),
					functions.eq(fields.entityId, itemId),
				),
			)
			.build(),
	);
	await transaction.executeStatement(
		transaction.db.sql.public.TransactionImportItem.delete()
			.where((fields, functions) => functions.eq(fields.id, itemId))
			.build(),
	);
}

export const TransactionImportsController = new Elysia({ prefix: "/transaction-imports" })
	.get("/", async ({ request }) => {
		const userId = await requireUserId(request);
		const imports = await queryRows(
			db.sql.public.TransactionImport.select("id")
				.where((fields, functions) =>
					functions.and(functions.eq(fields.userId, userId), functions.eq(fields.status, "PENDING")),
				)
				.orderBy("createdAt", { direction: "desc" })
				.build(),
		);
		return Promise.all(imports.map(transactionImport => getImportReturn(userId, transactionImport.id)));
	})
	.get("/:id", async ({ params, request }) => getImportReturn(await requireUserId(request), params.id), {
		params: t.Object({ id: t.String({ maxLength: 36, minLength: 1 }) }),
	})
	.post(
		"/",
		async ({ body, request }) => {
			const userId = await requireUserId(request);
			if (body.provider !== "MERCADO_PAGO")
				throw new HttpException("Este provider estará disponível em breve", 400);
			await assertBalanceAccountOwnership(body.financialAccountId, userId);
			if (body.file.type !== "application/pdf" && !body.file.name.toLowerCase().endsWith(".pdf"))
				throw new HttpException("Envie um arquivo PDF", 400);
			const fileBytes = new Uint8Array(await body.file.arrayBuffer());
			if (fileBytes.length < 5 || new TextDecoder().decode(fileBytes.slice(0, 5)) !== "%PDF-")
				throw new HttpException("Envie um PDF válido", 400);
			const statement = await parseMercadoPagoStatement(fileBytes.buffer);
			const transactionImport = await queryFirst(
				db.sql.public.TransactionImport.insert([
					{
						fileName: body.file.name.slice(0, 255),
						financialAccountId: body.financialAccountId,
						periodEnd: statement.periodEnd ? new Date(statement.periodEnd) : undefined,
						periodStart: statement.periodStart ? new Date(statement.periodStart) : undefined,
						provider: "MERCADO_PAGO",
						userId,
					},
				])
					.returning("id")
					.build(),
			);
			if (!transactionImport) throw new HttpException("Não foi possível criar a importação", 500);
			await executeStatement(
				db.sql.public.TransactionImportItem.insert(
					statement.transactions.map(transaction => ({
						amount: String(transaction.amount),
						balanceAfter: String(transaction.balanceAfter),
						date: new Date(transaction.date),
						description: transaction.description,
						destinationFinancialAccountId:
							transaction.type === "INCOME" || transaction.type === "YIELD"
								? body.financialAccountId
								: undefined,
						externalId: transaction.externalId,
						originFinancialAccountId: transaction.type === "EXPENSE" ? body.financialAccountId : undefined,
						transactionImportId: transactionImport.id,
						type: transaction.type,
					})),
				).build(),
			);
			return getImportReturn(userId, transactionImport.id);
		},
		{
			body: t.Object({
				file: t.File(),
				financialAccountId: t.String({ maxLength: 36, minLength: 1 }),
				provider: t.String(),
			}),
		},
	)
	.patch(
		"/:id/items/:itemId",
		async ({ body, params, request }) => {
			const userId = await requireUserId(request);
			const transactionImport = await getImport(userId, params.id);
			if (transactionImport.status !== "PENDING")
				throw new HttpException("Esta importação já foi aprovada", 400);
			const current = await queryFirst(
				db.sql.public.TransactionImportItem.select(
					"id",
					"amount",
					"date",
					"description",
					"destinationFinancialAccountId",
					"externalId",
					"isHidden",
					"isSelected",
					"originFinancialAccountId",
					"storeName",
					"time",
					"type",
				)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.id, params.itemId),
							functions.eq(fields.transactionImportId, transactionImport.id),
						),
					)
					.limit(1)
					.build(),
			);
			if (!current) throw new HttpException("Item da importação não encontrado", 404);
			const type = (body.type ?? current.type) as ImportItemType;
			const next = {
				amount: body.amount ?? Number(current.amount),
				date: body.date ?? toDateKey(current.date),
				description: body.description === undefined ? current.description : normalizeText(body.description),
				destinationFinancialAccountId:
					body.destinationFinancialAccountId === undefined
						? current.destinationFinancialAccountId
						: body.destinationFinancialAccountId,
				externalId: current.externalId,
				isHidden: body.isHidden ?? current.isHidden,
				isSelected: body.isSelected ?? current.isSelected,
				originFinancialAccountId:
					body.originFinancialAccountId === undefined
						? current.originFinancialAccountId
						: body.originFinancialAccountId,
				storeName: body.storeName === undefined ? current.storeName : normalizeText(body.storeName),
				time: body.time === undefined ? current.time : body.time,
				type,
			};
			await validateItemAccounts(next, userId);
			if (next.storeName && next.type !== "EXPENSE")
				throw new HttpException("Loja só pode ser informada em saídas", 400);
			if (next.storeName) await resolveStore(userId, next.storeName);
			const tagIds = body.tagIds === undefined ? undefined : await assertTagOwnership(body.tagIds, userId);
			await executeStatement(
				db.sql.public.TransactionImportItem.update({
					...next,
					amount: String(next.amount),
					categoryId: tagIds?.[0],
					date: new Date(next.date),
					updatedAt: new Date(),
				})
					.where((fields, functions) => functions.eq(fields.id, current.id))
					.build(),
			);
			if (tagIds)
				await replaceEntityTags({ entityIds: [current.id], entityType: importItemTagEntityType, tagIds });
			return getImportReturn(userId, transactionImport.id);
		},
		{ body: TransactionImportItemUpdateDTO, params: t.Object({ id: t.String(), itemId: t.String() }) },
	)
	.post(
		"/:id/items/:itemId/approve",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			const transactionImport = await getImport(userId, params.id);
			if (transactionImport.status !== "PENDING")
				throw new HttpException("Esta importação já foi aprovada", 400);
			const item = await queryFirst(
				db.sql.public.TransactionImportItem.select(
					"id",
					"amount",
					"date",
					"description",
					"destinationFinancialAccountId",
					"externalId",
					"isHidden",
					"isReconciled",
					"originFinancialAccountId",
					"storeName",
					"time",
					"type",
				)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.id, params.itemId),
							functions.eq(fields.transactionImportId, transactionImport.id),
						),
					)
					.limit(1)
					.build(),
			);
			if (!item) throw new HttpException("Item da importação não encontrado", 404);
			const importItem = { ...item, type: item.type as ImportItemType };
			const duplicates = await getPotentialDuplicates(transactionImport.financialAccountId, [importItem]);
			if (duplicates.get(item.id))
				throw new HttpException("Resolva a possível duplicata antes de aprovar", 400);
			const tagIds = await prepareImportItem(importItem, userId);
			await withTransaction(async transaction => {
				await persistImportItem(transaction, importItem, tagIds);
				await removeImportItem(transaction, item.id);
			});
			return { created: 1 };
		},
		{ params: t.Object({ id: t.String(), itemId: t.String() }) },
	)
	.post(
		"/:id/items/:itemId/reconcile",
		async ({ body, params, request }) => {
			const userId = await requireUserId(request);
			const transactionImport = await getImport(userId, params.id);
			if (transactionImport.status !== "PENDING")
				throw new HttpException("Esta importação já foi aprovada", 400);
			const [item] = await queryRows(
				db.sql.public.TransactionImportItem.select(
					"id",
					"amount",
					"date",
					"description",
					"destinationFinancialAccountId",
					"externalId",
					"isHidden",
					"originFinancialAccountId",
					"storeName",
					"time",
					"type",
				)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.id, params.itemId),
							functions.eq(fields.transactionImportId, transactionImport.id),
						),
					)
					.limit(1)
					.build(),
			);
			if (!item) throw new HttpException("Item da importação não encontrado", 404);
			const duplicates = await getPotentialDuplicates(transactionImport.financialAccountId, [
				{ ...item, type: item.type as ImportItemType },
			]);
			const duplicate = duplicates.get(item.id)?.candidate;
			if (!duplicate || duplicate.id !== body.duplicateId || duplicate.source !== body.duplicateSource)
				throw new HttpException("Duplicata não encontrada", 404);
			const itemTags = await getTagsByEntity(importItemTagEntityType, [item.id]);
			const source = <T>(field: (typeof reconciliationFields)[number], imported: T, existing: T) =>
				body.sources[field] === "duplicate" ? existing : imported;
			const type = source("type", item.type as ImportItemType, duplicate.type);
			const values = {
				amount: source("amount", item.amount, duplicate.amount),
				date: source("date", item.date, duplicate.date),
				description: source("description", item.description, duplicate.description),
				destinationFinancialAccountId: source(
					"destinationFinancialAccountId",
					item.destinationFinancialAccountId,
					duplicate.destinationFinancialAccountId,
				),
				isHidden: duplicate.isHidden,
				originFinancialAccountId: source(
					"originFinancialAccountId",
					item.originFinancialAccountId,
					duplicate.originFinancialAccountId,
				),
				storeName: source("storeName", item.storeName, duplicate.storeName),
				time: source("time", item.time, duplicate.time),
				type,
			};
			await validateItemAccounts(values, userId);
			if (values.storeName && values.type !== "EXPENSE")
				throw new HttpException("Loja só pode ser informada em saídas", 400);
			if (values.storeName) await resolveStore(userId, values.storeName);
			const tagIds = await assertTagOwnership(
				source(
					"tagIds",
					(itemTags.get(item.id) ?? []).map(tag => tag.id),
					duplicate.tagIds,
				),
				userId,
			);
			// A conciliação define a versão que será aprovada do item deste lote. O
			// candidato só fornece valores para a escolha; nunca deve ser alterado.
			await executeStatement(
				db.sql.public.TransactionImportItem.update({
					...values,
					amount: String(values.amount),
					date: new Date(values.date),
					isReconciled: true,
					updatedAt: new Date(),
				})
					.where((fields, functions) => functions.eq(fields.id, item.id))
					.build(),
			);
			await replaceEntityTags({ entityIds: [item.id], entityType: importItemTagEntityType, tagIds });
			return getImportReturn(userId, transactionImport.id);
		},
		{
			body: TransactionImportItemReconcileDTO,
			params: t.Object({ id: t.String(), itemId: t.String() }),
		},
	)
	.post(
		"/:id/approve",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			const transactionImport = await getImport(userId, params.id);
			if (transactionImport.status !== "PENDING")
				throw new HttpException("Esta importação já foi aprovada", 400);
			const items = await queryRows(
				db.sql.public.TransactionImportItem.select(
					"id",
					"amount",
					"categoryId",
					"date",
					"description",
					"destinationFinancialAccountId",
					"externalId",
					"isHidden",
					"originFinancialAccountId",
					"storeName",
					"time",
					"type",
				)
					.where((fields, functions) =>
						functions.and(
							functions.eq(fields.transactionImportId, transactionImport.id),
							functions.eq(fields.isSelected, true),
						),
					)
					.build(),
			);
			const tagIdsByItem = new Map<string, string[]>();
			for (const item of items) {
				await validateItemAccounts({ ...item, type: item.type as ImportItemType }, userId);
				if (item.storeName && item.type !== "EXPENSE")
					throw new HttpException("Loja só pode ser informada em saídas", 400);
				if (item.storeName) await resolveStore(userId, item.storeName);
				const tags = await getTagsByEntity(importItemTagEntityType, [item.id]);
				const tagIds = await assertTagOwnership(
					(tags.get(item.id) ?? []).map(tag => tag.id),
					userId,
				);
				tagIdsByItem.set(item.id, tagIds);
			}
			await withTransaction(async transaction => {
				for (const item of items) {
					const tagIds = tagIdsByItem.get(item.id) ?? [];
					if (item.type === "YIELD") {
						const existingYield = await transaction.queryFirst(
							transaction.db.sql.public.FinancialAccountYield.select("id")
								.where((fields, functions) =>
									functions.and(
										functions.eq(fields.financialAccountId, item.destinationFinancialAccountId!),
										functions.eq(fields.date, item.date),
										functions.eq(fields.kind, "MANUAL"),
									),
								)
								.limit(1)
								.build(),
						);
						const yieldValues = { amount: String(item.amount), isExcluded: false, updatedAt: new Date() };
						if (existingYield)
							await transaction.executeStatement(
								transaction.db.sql.public.FinancialAccountYield.update(yieldValues)
									.where((fields, functions) => functions.eq(fields.id, existingYield.id))
									.build(),
							);
						else
							await transaction.executeStatement(
								transaction.db.sql.public.FinancialAccountYield.insert([
									{
										...yieldValues,
										date: item.date,
										financialAccountId: item.destinationFinancialAccountId!,
										kind: "MANUAL",
									},
								]).build(),
							);
						continue;
					}
					const importedTransaction = await transaction.queryFirst(
						transaction.db.sql.public.Transaction.insert([
							{
								amount: String(item.amount),
								categoryId: tagIds[0],
								date: item.date,
								description: item.description,
								destinationFinancialAccountId: item.destinationFinancialAccountId,
								externalId: item.externalId,
								isHidden: item.isHidden,
								originFinancialAccountId: item.originFinancialAccountId,
								storeName: item.storeName,
								time: item.time,
								type: item.type as TransactionType,
							},
						])
							.returning("id")
							.build(),
					);
					if (!importedTransaction)
						throw new HttpException("Não foi possível salvar uma transação importada", 500);
					if (tagIds.length) {
						await transaction.executeStatement(
							transaction.db.sql.public.TagAssignment.insert(
								tagIds.map(categoryId => ({
									categoryId,
									entityId: importedTransaction.id,
									entityType: "TRANSACTION",
								})),
							).build(),
						);
					}
				}
				await transaction.executeStatement(
					transaction.db.sql.public.TransactionImport.update({ status: "APPROVED", updatedAt: new Date() })
						.where((fields, functions) => functions.eq(fields.id, transactionImport.id))
						.build(),
				);
			});
			return { created: items.length };
		},
		{ params: t.Object({ id: t.String() }) },
	)
	.delete(
		"/:id",
		async ({ params, request }) => {
			const userId = await requireUserId(request);
			const transactionImport = await getImport(userId, params.id);
			if (transactionImport.status !== "PENDING")
				throw new HttpException("Importações aprovadas não podem ser descartadas", 400);
			await executeStatement(
				db.sql.public.TransactionImport.delete()
					.where((fields, functions) => functions.eq(fields.id, transactionImport.id))
					.build(),
			);
			return { success: true };
		},
		{ params: t.Object({ id: t.String() }) },
	);
