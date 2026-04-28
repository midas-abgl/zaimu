import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HiBanknotes, HiCalendarDays, HiCheck, HiPlus, HiXMark } from "react-icons/hi2";
import { api, type Salary } from "@/lib/api";
import { type AuthState, useAuthStore } from "@/stores";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		currency: "BRL",
		style: "currency",
	}).format(value);
}

const frequencyOptions = [
	{ id: "MONTHLY", label: "Monthly" },
	{ id: "BIWEEKLY", label: "Biweekly" },
	{ id: "WEEKLY", label: "Weekly" },
	{ id: "YEARLY", label: "Yearly" },
];

function SalaryCard({ salary, inactive }: { salary: Salary; inactive?: boolean }) {
	const frequencyLabel = frequencyOptions.find(f => f.id === salary.frequency)?.label || salary.frequency;

	return (
		<div className={`card p-4 transition-opacity ${inactive ? "opacity-60" : ""}`}>
			<div className="flex items-center gap-4">
				<div
					className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
						inactive ? "bg-primary-100 text-primary-400" : "bg-success-100 text-success-600"
					}`}
				>
					<HiBanknotes className="h-6 w-6" />
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate font-semibold text-foreground">{salary.source}</p>
					<div className="mt-1 flex items-center gap-2">
						<HiCalendarDays className="h-3.5 w-3.5 text-foreground-muted" />
						<span className="text-foreground-muted text-xs">
							Day {salary.payDay} • {frequencyLabel}
						</span>
					</div>
				</div>
				<div className="text-right">
					<p className={`font-bold ${inactive ? "text-foreground-muted" : "text-success-600"}`}>
						{formatCurrency(salary.netAmount)}
					</p>
					<p className="text-foreground-muted text-xs">Gross: {formatCurrency(salary.grossAmount)}</p>
				</div>
			</div>
		</div>
	);
}

function SalariesPage() {
	const queryClient = useQueryClient();
	const user = useAuthStore((s: AuthState) => s.user);
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [newSalary, setNewSalary] = useState({
		frequency: "MONTHLY",
		grossAmount: "",
		netAmount: "",
		payDay: "",
		source: "",
		startDate: new Date().toISOString().split("T")[0],
	});

	const { data: salaries, isLoading } = useQuery({
		enabled: !!user?.id,
		queryFn: () => api.getSalaries({ userId: user?.id }),
		queryKey: ["salaries", user?.id],
	});

	const createMutation = useMutation({
		mutationFn: (data: Parameters<typeof api.createSalary>[0]) => api.createSalary(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["salaries"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			setIsCreateModalOpen(false);
			resetForm();
		},
	});

	const resetForm = () => {
		setNewSalary({
			frequency: "MONTHLY",
			grossAmount: "",
			netAmount: "",
			payDay: "",
			source: "",
			startDate: new Date().toISOString().split("T")[0],
		});
	};

	const handleCreate = () => {
		createMutation.mutate({
			frequency: newSalary.frequency as Salary["frequency"],
			grossAmount: Number.parseFloat(newSalary.grossAmount),
			netAmount: Number.parseFloat(newSalary.netAmount),
			payDay: Number.parseInt(newSalary.payDay, 10),
			source: newSalary.source,
			startDate: newSalary.startDate,
			userId: user!.id,
		});
	};

	const activeSalaries = salaries?.filter(s => s.isActive) || [];
	const inactiveSalaries = salaries?.filter(s => !s.isActive) || [];
	const totalMonthlyNet = activeSalaries.reduce((sum, s) => sum + s.netAmount, 0);

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="gradient-primary px-4 pt-12 pb-20">
					<div className="mb-4 h-8 w-32 animate-pulse rounded-lg bg-white/20" />
					<div className="h-10 w-48 animate-pulse rounded-lg bg-white/20" />
				</div>
				<div className="-mt-12 space-y-3 px-4">
					{[1, 2].map(i => (
						<div className="h-20 animate-pulse rounded-2xl bg-background-card" key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="relative overflow-hidden bg-gradient-to-br from-success-600 to-success-500 px-4 pt-12 pb-24">
				<div className="absolute top-0 right-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-white/10" />
				<div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/4 translate-y-1/2 rounded-full bg-white/5" />

				<div className="relative z-10">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="font-bold text-2xl text-white">Salaries</h1>
						<button
							className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Add</span>
						</button>
					</div>

					{activeSalaries.length > 0 && (
						<div>
							<p className="mb-1 text-sm text-white/70">Total Monthly Income (Net)</p>
							<p className="font-bold text-4xl text-white tracking-tight">
								{formatCurrency(totalMonthlyNet)}
							</p>
							<p className="mt-2 text-sm text-white/70">
								{activeSalaries.length} active source{activeSalaries.length !== 1 ? "s" : ""}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Salary List */}
			<div className="-mt-12 space-y-4 px-4 pb-8">
				{activeSalaries.length > 0 && (
					<div className="animate-fade-in">
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Active</p>
						<div className="space-y-3">
							{activeSalaries.map((salary, idx) => (
								<div className="animate-fade-in" key={salary.id} style={{ animationDelay: `${idx * 0.1}s` }}>
									<SalaryCard salary={salary} />
								</div>
							))}
						</div>
					</div>
				)}

				{inactiveSalaries.length > 0 && (
					<div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
						<p className="mb-2 px-1 font-medium text-foreground-muted text-sm">Inactive</p>
						<div className="space-y-3">
							{inactiveSalaries.map(salary => (
								<SalaryCard inactive key={salary.id} salary={salary} />
							))}
						</div>
					</div>
				)}

				{(!salaries || salaries.length === 0) && (
					<div className="card animate-fade-in py-12 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
							<HiBanknotes className="h-8 w-8 text-success-400" />
						</div>
						<p className="mb-1 font-semibold text-foreground">No income sources</p>
						<p className="mb-4 text-foreground-muted text-sm">
							Add your salary or income to track your earnings
						</p>
						<button
							className="inline-flex items-center gap-2 rounded-xl bg-success-500 px-6 py-3 font-semibold text-white transition-all hover:bg-success-600 active:scale-95"
							onClick={() => setIsCreateModalOpen(true)}
						>
							<HiPlus className="h-5 w-5" />
							<span>Add Income</span>
						</button>
					</div>
				)}
			</div>

			{/* Create Modal */}
			{isCreateModalOpen && (
				<div className="fixed inset-0 z-50 flex items-end justify-center">
					<div
						className="absolute inset-0 animate-fade-in bg-primary-900/50 backdrop-blur-sm"
						onClick={() => setIsCreateModalOpen(false)}
					/>

					<div className="relative max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-6">
						<div className="absolute top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary-200" />

						<div className="mb-6 flex items-center justify-between pt-2">
							<h2 className="font-bold text-foreground text-xl">New Salary</h2>
							<button
								className="rounded-full p-2 transition-colors hover:bg-primary-50"
								onClick={() => setIsCreateModalOpen(false)}
							>
								<HiXMark className="h-6 w-6 text-foreground-muted" />
							</button>
						</div>

						{/* Source */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Source</span>
							<input
								className="input"
								onChange={e => setNewSalary({ ...newSalary, source: e.target.value })}
								placeholder="e.g., Company Name"
								type="text"
								value={newSalary.source}
							/>
						</div>

						{/* Amounts */}
						<div className="mb-4 grid grid-cols-2 gap-3">
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Gross Amount</span>
								<div className="relative">
									<span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-foreground-muted">
										R$
									</span>
									<input
										className="input pl-12"
										onChange={e => setNewSalary({ ...newSalary, grossAmount: e.target.value })}
										placeholder="5000"
										step="0.01"
										type="number"
										value={newSalary.grossAmount}
									/>
								</div>
							</div>
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Net Amount</span>
								<div className="relative">
									<span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-foreground-muted">
										R$
									</span>
									<input
										className="input pl-12"
										onChange={e => setNewSalary({ ...newSalary, netAmount: e.target.value })}
										placeholder="4000"
										step="0.01"
										type="number"
										value={newSalary.netAmount}
									/>
								</div>
							</div>
						</div>

						{/* Frequency */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Frequency</span>
							<div className="grid grid-cols-2 gap-2">
								{frequencyOptions.map(option => (
									<button
										className={`rounded-xl px-4 py-2.5 font-medium text-sm transition-all ${
											newSalary.frequency === option.id
												? "bg-success-500 text-white"
												: "bg-background-card text-foreground hover:bg-primary-100"
										}`}
										key={option.id}
										onClick={() => setNewSalary({ ...newSalary, frequency: option.id })}
									>
										{option.label}
									</button>
								))}
							</div>
						</div>

						{/* Pay Day and Start Date */}
						<div className="mb-6 grid grid-cols-2 gap-3">
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Pay Day</span>
								<input
									className="input"
									max="31"
									min="1"
									onChange={e => setNewSalary({ ...newSalary, payDay: e.target.value })}
									placeholder="5"
									type="number"
									value={newSalary.payDay}
								/>
							</div>
							<div>
								<span className="mb-2 block font-medium text-foreground-muted text-sm">Start Date</span>
								<input
									className="input"
									onChange={e => setNewSalary({ ...newSalary, startDate: e.target.value })}
									type="date"
									value={newSalary.startDate}
								/>
							</div>
						</div>

						{/* Actions */}
						<div className="flex gap-3">
							<button className="btn-secondary flex-1" onClick={() => setIsCreateModalOpen(false)}>
								Cancel
							</button>
							<button
								className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-success-500 px-6 py-3 font-semibold text-white transition-all hover:bg-success-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={
									!newSalary.source ||
									!newSalary.grossAmount ||
									!newSalary.netAmount ||
									!newSalary.payDay ||
									createMutation.isPending
								}
								onClick={handleCreate}
							>
								{createMutation.isPending ? (
									<span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								) : (
									<>
										<HiCheck className="h-5 w-5" />
										<span>Create</span>
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export const Route = createFileRoute("/salaries")({
	component: SalariesPage,
});
