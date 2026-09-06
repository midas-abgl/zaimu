import { createFileRoute } from "@tanstack/react-router";
import { LegalDocumentPage } from "@/components/legal";
import privacyContent from "@/content/legal/privacy.md?raw";

function PrivacyPage() {
	return <LegalDocumentPage content={privacyContent} title="Privacy Policy" />;
}

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });
