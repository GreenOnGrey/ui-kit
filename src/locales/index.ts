import en from "./en.json";
import ru from "./ru.json";
import de from "./de.json";
import es from "./es.json";
import zh from "./zh.json";

/** Strings of the components in the five languages of the products. A product adds
 * them to its i18next instance under the namespace `uikit`. */
export const resources = { en, ru, de, es, zh };
export type KitLanguage = keyof typeof resources;
export { UIKIT_NS } from "../i18n";
