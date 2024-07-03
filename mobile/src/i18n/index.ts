import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
	pt: { translation: import("./pt.json") },
};

i18n.use(initReactI18next).init({
	fallbackLng: "pt",
	interpolation: {
		escapeValue: false,
	},
	resources,
});

export default i18n;
