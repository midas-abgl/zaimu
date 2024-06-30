import Image from "next/image";
import React from "react";
import styles from "./Avatar.module.scss";

interface AvatarProps {
	src: string;
}

export default function Avatar({ src }: AvatarProps) {
	return (
		<div className={styles.avatar}>
			<Image src={src} alt="Avatar-profile" width={50} height={50} />
		</div>
	);
}
