import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal";
import termsContent from "@/content/legal/terms.md?raw";

function TermsPage() {
	return <LegalDocumentPage content={termsContent} title="Terms & Conditions" />;
}

export const Route = createFileRoute("/terms")({ component: TermsPage });
