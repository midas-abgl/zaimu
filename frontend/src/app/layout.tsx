import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { PropsWithChildren } from "react";
import "./_global.scss";
import Navbar from "./components/Navbar";
import WebVitals from "./components/WebVitals";

const siteName = "Zaimu";
const url = "https://zaimu.me";

export const metadata = {
	applicationName: siteName,
	appleWebApp: {
		title: siteName,
	},
	metadataBase: new URL(url),
	openGraph: {
		images: [
			{
				url: "/opengraph.jpg",
				width: 1200,
				height: 627,
				alt: siteName,
			},
		],
		siteName,
		type: "website",
	},
	title: {
		default: siteName,
		template: `%s | ${siteName}`,
	},
	twitter: {
		card: "summary_large_image",
		creator: `${process.env.NEXT_PUBLIC_SITE_CONTENT_CREATOR}` || "@hyoretsu",
	},
};
export const viewport = {
	themeColor: "#4F53B7",
};

export default async function RootLayout({ children }: PropsWithChildren) {
	const locale = await getLocale();

	return (
		<html lang={locale}>
			<head>
				<link rel="icon" type="image/svg+xml" href="favicon.svg" />
				<link rel="icon" type="image/png" href="favicon.png" />
				<link rel="manifest" href="/site.webmanifest" />
				<meta name="theme-color" content={viewport.themeColor} />
			</head>
			<body>
				<NextIntlClientProvider>
					<aside>
						<Navbar />
					</aside>

					<main style={{ flex: 1, padding: "20px" }}>{children}</main>
				</NextIntlClientProvider>

				{process.env.NODE_ENV === "production" && <WebVitals />}
			</body>
		</html>
	);
}
