"use client";

import { CaretDown } from "@phosphor-icons/react";
import styles from "./Footer.module.scss";

export default function Footer() {
	return (
		<footer className={styles.footerContainer}>
			<div className={styles.buttonContainer}>
				{/* biome-ignore lint/a11y/useButtonType: <explanation> */}
				<button className={styles.arrowButton}>
					<CaretDown size={80} />
				</button>
			</div>
			<div className={styles.tm}>
				<p className={styles.tmp}>Developed by Midas&trade;</p>
			</div>
		</footer>
	);
}
