export const locales = ["id", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "id";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Swaps the locale segment of a path, keeping the rest of the route. */
export function localePath(locale: Locale, path = "") {
  const clean = path.replace(/^\/+/, "");
  return clean ? `/${locale}/${clean}` : `/${locale}`;
}

export const localeLabel: Record<Locale, string> = { id: "ID", en: "EN" };
