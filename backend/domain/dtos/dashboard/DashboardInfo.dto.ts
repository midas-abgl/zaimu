export interface DashboardInfo {
	balance: number;
	expenses: {
		current: number;
		next: number;
	};
	income: {
		current: number;
		next: number;
	};
}
