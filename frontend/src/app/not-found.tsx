import type { Metadata } from "next";
import { IoMdCloseCircleOutline } from "react-icons/io";
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
			<IoMdCloseCircleOutline />
			<span>Error 404</span>
			<span>Not Found</span>
		</div>
	);
}
