"use server";
import { cookies } from "next/headers";
import { type Locale, defaultLocale } from "./config";

const COOKIE_NAME = "NEXT_LOCALE";

export const getUserLocale = async () => {
	return (await cookies()).get(COOKIE_NAME)?.value || defaultLocale;
};

export const setUserLocale = async (locale: Locale) => {
	(await cookies()).set(COOKIE_NAME, locale);
};
