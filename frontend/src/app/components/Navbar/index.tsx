"use client";
import { Link } from "@hyoretsu/react-components";
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
					src="/petZaimu.svg"
					alt="Toggle Sidebar"
					width={50}
					height={50}
				/>
			</button>

			<div>
				<NavbarItem name="Menu" url="/" expanded={isExpanded}>
					<Image src="/iconMenu.svg" alt="Menu" width={25} height={25} />
				</NavbarItem>

				<NavbarItem name="Expenses" url="/expenses" expanded={isExpanded}>
					<Image src="/iconWallet.svg" alt="Expenses" width={25} height={25} />
				</NavbarItem>

				<NavbarItem name="Dashboard" url="/dashboard" expanded={isExpanded}>
					<Image src="/iconSquare.svg" alt="Dashboard" width={25} height={25} />
				</NavbarItem>

				<NavbarItem name="Income" url="/income" expanded={isExpanded}>
					<Image src="/iconIncome.svg" alt="Income" width={25} height={25} />
				</NavbarItem>
			</div>

			<div className={styles.bottomIcons}>
				<Avatar src="/petZaimu.svg" />

				<Link href="/" className={styles.navbarButton}>
					<Image src="/iconExit.svg" alt="Expenses" width={25} height={25} />
				</Link>
			</div>
		</nav>
	);
}
