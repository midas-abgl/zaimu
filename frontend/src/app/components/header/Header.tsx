"use client";

import { Bell, CrownSimple, DotsThreeVertical } from "@phosphor-icons/react";
import React from "react";
import ZaimuIcon from "../../../../public/zaimu-icon.svg";
import styles from "./Header.module.scss";
interface HeaderProps {
	zaimu?: boolean;
}

export default function Header({ zaimu }: HeaderProps) {
	const hasNotification = true;

	return (
		<header className={styles.header}>
			<div className={styles.zaimuParamter}>{zaimu && <ZaimuIcon />}</div>
			<div className={styles.headerContent}>
				<button type="submit" className={styles.buttonPremium}>
					<CrownSimple size={16} weight="bold" />
					PREMIUM
				</button>

				{/* biome-ignore lint/a11y/useButtonType: <explanation> */}
				<button className={styles.buttonNotification}>
					<Bell size={30} />
					{/* biome-ignore lint/style/useSelfClosingElements: <explanation> */}
					{hasNotification && <span className={styles.notificationDot}></span>}
				</button>

				{/* biome-ignore lint/a11y/useButtonType: <explanation> */}
				<button className={styles.buttonMore}>
					<DotsThreeVertical size={30} weight="bold" />
				</button>
			</div>
		</header>
	);
}
