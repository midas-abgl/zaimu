import type { ChangeEvent } from "react";
import { LuFileUp } from "react-icons/lu";
import { Label } from "@/components/ui/Label";
import { RequiredMark } from "@/components/ui/RequiredMark";

export function StatementFilePicker({
	file,
	onFileChange,
}: {
	file: File | null;
	onFileChange: (file: File | null) => void;
}) {
	const inputId = "transaction-import-file";
	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		onFileChange(event.currentTarget.files?.[0] ?? null);
	};

	return (
		<div className="grid content-start gap-2">
			<Label htmlFor={inputId}>
				<span>
					Extrato do Mercado Pago <RequiredMark />
				</span>
			</Label>
			<input
				accept="application/pdf,.pdf"
				aria-describedby={`${inputId}-description`}
				className="sr-only"
				id={inputId}
				key={file?.name ?? "empty"}
				name="statement"
				onChange={handleFileChange}
				required
				type="file"
			/>
			<Label
				className="h-10 cursor-pointer justify-center rounded-4xl border bg-input/30 px-3 text-sm transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 hover:bg-input/50"
				htmlFor={inputId}
			>
				<LuFileUp /> Selecionar arquivo
			</Label>
			<p aria-live="polite" className="truncate text-muted-foreground text-sm">
				{file?.name ?? "Nenhum arquivo selecionado"}
			</p>
			<p className="text-muted-foreground text-xs" id={`${inputId}-description`}>
				Apenas arquivos PDF.
			</p>
		</div>
	);
}
