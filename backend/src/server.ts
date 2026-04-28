import { AccountsController } from "./modules/accounts/infra";
import { CategoriesController } from "./modules/categories/infra";
import { CreditCardsController } from "./modules/creditCards/infra";
import { DashboardController } from "./modules/dashboard/infra";
import { DebtsController } from "./modules/debts/infra";
import { LoansController } from "./modules/loans/infra";
import { RecurringController } from "./modules/recurring/infra";
import { SalariesController } from "./modules/salaries/infra";
import { SubscriptionsController } from "./modules/subscriptions/infra";
import { TransactionsController } from "./modules/transactions/infra";
import { UsersController } from "./modules/users/infra";
import { app } from "./shared/infra/elysia";

export const server = app.use([
	UsersController,
	AccountsController,
	TransactionsController,
	CreditCardsController,
	LoansController,
	DebtsController,
	SalariesController,
	SubscriptionsController,
	RecurringController,
	CategoriesController,
	DashboardController,
]);
