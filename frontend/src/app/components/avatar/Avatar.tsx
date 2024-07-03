import Image from "next/image";
import { useState } from "react";
import styles from "./Avatar.module.scss";

interface AvatarProps {
	src: string;
}

export default function Avatar({ src: initialSrc }: AvatarProps) {
	const [imageSrc, setImageSrc] = useState(initialSrc);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files?.[0]) {
			const file = event.target.files[0];
			const imageUrl = URL.createObjectURL(file);
			setImageSrc(imageUrl);
		}
	};

	return (
		<>
			<input
				type="file"
				accept="image/png, image/jpeg"
				className={styles.input}
				onChange={handleFileChange}
			/>
			<div>
				<Image
					className={styles.avatar}
					src={imageSrc}
					alt="Avatar-profile"
					width={50}
					height={50}
					unoptimized={true}
				/>
			</div>
		</>
	);
}
