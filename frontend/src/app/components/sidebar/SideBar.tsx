"use client";
import {
	Coins,
	type IconWeight,
	SignOut,
	SquaresFour,
	TextAlignJustify,
	Wallet,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import petZaimu from "../../../../public/pet-zaimu.png";
import Avatar from "../avatar/Avatar";
import styles from "./Sidebar.module.scss";

export default function Sidebar() {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const [menuItems, setMenuItems] = useState([
		{ icon: TextAlignJustify, name: "Menu", weight: "light" as IconWeight, url: "/" },
		{ icon: Wallet, name: "Expenses", weight: "light" as IconWeight, url: "/wallet" },
		{ icon: SquaresFour, name: "Dashboard", weight: "light" as IconWeight, url: "/dashboard" },
		{ icon: Coins, name: "Income", weight: "light" as IconWeight, url: "/coins" },
	]);

	const toggleSidebar = () => {
		setIsCollapsed(!isCollapsed);
	};

	const handleItemClick = (index: number) => {
		setActiveIndex(index);

		const updatedItems = [...menuItems];

		updatedItems[index].weight = "duotone";

		updatedItems.forEach((item, idx) => {
			if (idx !== index) {
				item.weight = "light";
			}
		});

		setMenuItems(updatedItems);
	};

	return (
		<div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : styles.expanded}`}>
			<button type="button" className={styles.toggleButton} onClick={toggleSidebar}>
				<Image className="toggle-sidebar-icon" src={petZaimu} alt="Toggle Sidebar" width={50} height={50} />
			</button>
			<ul className={styles.menu}>
				{menuItems.map((item, index) => (
					<li
						key={index}
						className={`${styles.menuItem} ${activeIndex === index ? styles.active : ""}`}
						onClick={() => handleItemClick(index)}
					>
						<a href={item.url} className={styles.iconsMap}>
							<item.icon size={32} weight={item.weight} />
							<p className={styles.itemName}>{item.name}</p>
						</a>
					</li>
				))}
				<div className={styles.avatar}>
					<Avatar src="/pet-zaimu.png" />
				</div>

				<a href="/" className={`${styles.menuItem} ${styles.linksignout}`}>
					<SignOut size={32} weight="light" className={styles.signout} />
				</a>
			</ul>
		</div>
	);
}
