import { LuWalletCards } from "react-icons/lu";

export function BrandMark({ compact = false }: { compact?: boolean }) {
	return (
		<div className="flex items-center gap-3">
			<span className="flex size-11 items-center justify-center rounded-2xl bg-brand-yellow text-brand-ink shadow-[0_8px_24px_rgba(36,36,36,.12)]">
				<LuWalletCards className="size-6" />
			</span>
			{!compact && (
				<span>
					<strong className="block text-xl leading-none">Zaimu</strong>
					<span className="text-muted-foreground text-xs">Seu dinheiro, sem ruído.</span>
				</span>
			)}
		</div>
	);
}
