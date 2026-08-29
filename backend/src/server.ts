import { AccountsController, InstitutionsController } from "./modules/accounts/infra";
import { CategoriesController } from "./modules/categories/infra";
import { CreditCardsController } from "./modules/creditCards/infra";
import { DashboardController } from "./modules/dashboard/infra";
import { DebtsController } from "./modules/debts/infra";
import { LoansController } from "./modules/loans/infra";
import { RecurringController } from "./modules/recurring/infra";
import { SalariesController } from "./modules/salaries/infra";
import { StoresController } from "./modules/stores/infra";
import { SubscriptionsController } from "./modules/subscriptions/infra";
import { SyncController } from "./modules/sync";
import { TransactionsController } from "./modules/transactions/infra";
import { app } from "./shared/infra/elysia";

export const server = app.use([
	AccountsController,
	InstitutionsController,
	TransactionsController,
	CreditCardsController,
	LoansController,
	DebtsController,
	SalariesController,
	SubscriptionsController,
	RecurringController,
	CategoriesController,
	StoresController,
	DashboardController,
	SyncController,
]);
