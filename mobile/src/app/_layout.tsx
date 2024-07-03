import { BetterStatusBar } from "@hyoretsu/rn-components";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "intl-pluralrules";
import "../i18n";

import i18n from "../i18n";

SplashScreen.preventAutoHideAsync();

const Layout: React.FC = () => {
	const [fontsLoaded, fontError] = useFonts({});

	if (!fontsLoaded && !fontError) {
		return null;
	}

	SplashScreen.hideAsync();

	return (
		<>
			<BetterStatusBar backgroundColor="#3700B3" />
			<I18nextProvider i18n={i18n}>
				<GestureHandlerRootView>
					<Slot />
				</GestureHandlerRootView>
			</I18nextProvider>
		</>
	);
};

export default Layout;
