"use client";
import { Coins, type IconWeight, SquaresFour, TextAlignJustify, Wallet } from "@phosphor-icons/react";
import Image from "next/image";
import { useState } from "react";
import petZaimu from "../../../../public/pet-zaimu.png";
import styles from "./Sidebar.module.scss";

export default function Sidebar() {
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [activeIndex, setActiveIndex] = useState(0);
	const [menuItems, setMenuItems] = useState([
		{ icon: TextAlignJustify, name: "Menu", weight: "light" as IconWeight },
		{ icon: Wallet, name: "Expenses", weight: "light" as IconWeight },
		{ icon: SquaresFour, name: "Dashboard", weight: "light" as IconWeight },
		{ icon: Coins, name: "Income", weight: "light" as IconWeight },
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
						{/* biome-ignore lint/a11y/useValidAnchor: <explanation> */}
						<a href="#">
							<item.icon size={32} weight={item.weight} />
							<p>{item.name}</p>
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}
