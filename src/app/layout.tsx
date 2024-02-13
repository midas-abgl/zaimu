import { PropsWithChildren } from "react";
import "./_global.scss";
import WebVitals from "./components/WebVitals";

const url = "https://zaimu.me";

const siteColor = "#1e5a70";
const siteName = "Zaimu";

export const metadata = {
	applicationName: siteName,
	appleWebApp: {
		title: siteName,
	},
	metadataBase: new URL(url),
	openGraph: {
		images: [
			{
				url: "/images/opengraph.jpg",
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
	themeColor: siteColor,
};

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="apple-touch-icon" sizes="57x57" href="/apple-touch-icon-57x57.png" />
				<link rel="apple-touch-icon" sizes="60x60" href="/apple-touch-icon-60x60.png" />
				<link rel="apple-touch-icon" sizes="72x72" href="/apple-touch-icon-72x72.png" />
				<link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon-76x76.png" />
				<link rel="apple-touch-icon" sizes="114x114" href="/apple-touch-icon-114x114.png" />
				<link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
				<link rel="apple-touch-icon" sizes="144x144" href="/apple-touch-icon-144x144.png" />
				<link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicons/favicon-16x16.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png" />
				<link rel="icon" type="image/png" sizes="192x192" href="/favicons/android-chrome-192x192.png" />
				<link rel="icon" type="image/png" sizes="194x194" href="/favicons/favicon-194x194.png" />
				<link rel="manifest" href="/site.webmanifest" />
				<link rel="mask-icon" href="/safari-pinned-tab.svg" color={siteColor} />
				<meta name="msapplication-TileColor" content={siteColor} />
				<meta name="msapplication-TileImage" content="/mstile-144x144.png" />
				<meta name="theme-color" content={siteColor} />
			</head>
			<body>
				{children}

				{process.env.NODE_ENV === "production" && <WebVitals />}
			</body>
		</html>
	);
}
