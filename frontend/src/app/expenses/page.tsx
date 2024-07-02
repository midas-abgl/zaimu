import Header from "@app/components/header/Header";
import styles from "./styles.module.scss";
export default function Expenses() {
	return (
		<div>
			<Header zaimu={true} />
			<section className={styles.container}>
				<div className={styles.insideContainer}>
					<h1 className={styles.title}>Expense Manager</h1>
					{/* biome-ignore lint/style/useSelfClosingElements: <explanation> */}
					{/* biome-ignore lint/a11y/useButtonType: <explanation> */}
					<button className={styles.insideButton}>+ ADD EXPENSE</button>
				</div>
				<p>Control your finances!</p>
			</section>
		</div>
	);
}
