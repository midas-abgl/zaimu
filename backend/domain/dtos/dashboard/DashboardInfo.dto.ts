export interface DashboardInfo {
	balance: number;
	expectedIncome: number;
	expenses: {
		current: number;
		next: number;
	};
}
