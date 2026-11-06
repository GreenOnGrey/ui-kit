import { kitI18n } from "../src/testing";

// The showcase speaks English; the strings of the components come from the kit
// exactly as in a product: resources[lng].uikit = kit[lng]. ?lng=ru draws the components with the Russian
// dictionary, whose longer strings the snapshots of e2e/visual.spec.ts check too.
export const LNG = new URLSearchParams(location.search).get("lng") === "ru" ? "ru" : "en";
export const i18n = kitI18n(LNG);
// The page names the language of its components: hyphenation and screen readers follow it.
document.documentElement.lang = LNG;
