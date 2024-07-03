import type { Metadata } from "next";
import styles from "./styles.module.scss";

export const metadata: Metadata = {
	robots: {
		follow: false,
		index: false,
	},
};

export default function NotFound() {
	return (
		<div className={styles.notFound}>
			<span>Error 404</span>
			<span>Not Found</span>
		</div>
	);
}
