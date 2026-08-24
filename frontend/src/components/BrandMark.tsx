export function BrandMark({ compact = false }: { compact?: boolean }) {
	return (
		<div className="flex items-center gap-3">
			<img
				alt=""
				className="size-11 rounded-[0.65rem] shadow-[0_8px_24px_rgba(36,36,36,.12)]"
				src="/zaimu-icon.svg"
			/>
			{!compact && (
				<div>
					<img alt="Zaimu" className="h-6 w-auto dark:invert" src="/brand/zaimu-wordmark.svg" />
					<span className="mt-1 block text-muted-foreground text-xs">Seu dinheiro, sem ruído.</span>
				</div>
			)}
		</div>
	);
}
