import type { PropsWithChildren } from "react";
import "./_global.scss";
import { viewport } from "../metadata";
import WebVitals from "./components/WebVitals";
import Sidebar from "./components/sidebar/SideBar";

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="icon" type="image/svg+xml" href="favicon.svg" />
				<link rel="icon" type="image/png" href="favicon.png" />
				<link rel="manifest" href="/site.webmanifest" />
				<meta name="theme-color" content={viewport.themeColor} />
			</head>
			<body>
				<div style={{ display: "flex", height: "100vh" }}>
					<Sidebar />
					<main style={{ flex: 1, padding: "20px" }}>{children}</main>
				</div>
				{process.env.NODE_ENV === "production" && <WebVitals />}
			</body>
		</html>
	);
}
