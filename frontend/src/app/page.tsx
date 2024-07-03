import Image from "next/image";
import Footer from "./components/footer/Footer";
import Header from "./components/header/Header";
import styles from "./styles.module.scss";

export default function Home() {
	return (
		<div className={styles.container}>
			<div className={styles.headerContainer}>
				<Header />
			</div>
			<Image src="/Zaimu.svg" alt="Picture of the author" width={650} height={500} className={styles.image} />
			<Footer />
		</div>
	);
}
