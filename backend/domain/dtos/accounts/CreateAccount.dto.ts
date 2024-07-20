export interface CreateAccountDTO {
	company: string;
	income: {
		amount: number;
		frequency: string;
	};
	userEmail: string;
}
