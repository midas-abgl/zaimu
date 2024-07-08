"use client";
import { usePathname, useRouter } from "next/navigation";
import { type ReactElement, cloneElement } from "react";
import styles from "../styles.module.scss";

export type NavbarItemProps = {
	children: ReactElement;
	expanded?: boolean;
	name: string;
	url: string;
};

export default function NavbarItem({ children, expanded = false, name, url }: NavbarItemProps) {
	const pathname = usePathname();
	const router = useRouter();

	const isCurrentPage = pathname === url;

	console.log(pathname === url);
	console.log();

	return (
		<button
			type="button"
			className={`${styles.navbarButton} ${expanded ? styles.expanded : ""} ${isCurrentPage ? "current" : ""}`}
			onClick={() => router.push(url)}
			style={{ opacity: isCurrentPage ? 1 : 0.2 }}
		>
			{cloneElement(children, { size: 32, weight: isCurrentPage ? "duotone" : "light" })}

			<p className={`${styles.itemName} ${expanded ? styles.expanded : ""}`}>{name}</p>
		</button>
	);
}
