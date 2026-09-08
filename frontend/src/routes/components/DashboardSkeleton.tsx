import { PageContainer } from "@/components/ui/PageContainer";
import { Skeleton } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
	return (
		<PageContainer className="space-y-6">
			<Skeleton className="h-28 rounded-2xl" />
			<div className="grid gap-4 sm:grid-cols-3">
				{[1, 2, 3].map(item => (
					<Skeleton className="h-36 rounded-2xl" key={item} />
				))}
			</div>
			<Skeleton className="h-80 rounded-2xl" />
			<div className="grid gap-4 lg:grid-cols-2">
				{[1, 2, 3, 4].map(item => (
					<Skeleton className="h-52 rounded-2xl" key={item} />
				))}
			</div>
		</PageContainer>
	);
}
