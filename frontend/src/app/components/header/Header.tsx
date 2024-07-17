"use client";

import { Bell, DotsThreeVertical } from "@phosphor-icons/react";
import Image from "next/image";
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
					<Image src="/crown.svg" alt="Zaimu" width={20} height={20} />
					<span className={styles.premiumSpan}>PREMIUM</span>
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
