"use client";
import { Link } from "@hyoretsu/react-components";
import { Coins, SignOut, SquaresFour, TextAlignJustify, Wallet } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import Avatar from "./components/Avatar";
import NavbarItem from "./components/Item";
import styles from "./styles.module.scss";

export default function Navbar() {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<nav className={`${styles.navbar} ${isExpanded ? styles.expanded : ""}`}>
			<button type="button" onClick={() => setIsExpanded(old => !old)}>
				<Image
					className={styles.toggleSidebar}
					src="/pet-zaimu.png"
					alt="Toggle Sidebar"
					width={50}
					height={50}
				/>
			</button>

			<div>
				<NavbarItem name="Menu" url="/" expanded={isExpanded}>
					<TextAlignJustify />
				</NavbarItem>

				<NavbarItem name="Expenses" url="/expenses" expanded={isExpanded}>
					<Wallet />
				</NavbarItem>

				<NavbarItem name="Dashboard" url="/dashboard" expanded={isExpanded}>
					<SquaresFour />
				</NavbarItem>

				<NavbarItem name="Income" url="/income" expanded={isExpanded}>
					<Coins />
				</NavbarItem>
			</div>

			<div className={styles.bottomIcons}>
				<Avatar src="/pet-zaimu.png" />

				<Link href="/" className={styles.navbarButton}>
					<SignOut size={32} weight="light" />
				</Link>
			</div>
		</nav>
	);
}
