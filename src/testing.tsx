import { createInstance } from "i18next";
import ICU from "i18next-icu";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { UIKIT_NS } from "./i18n";
import { resources } from "./locales";

/** An i18next instance with the strings of the kit, as a product sets it up. */
export function kitI18n(lng: keyof typeof resources = "en") {
  const inst = createInstance();
  inst.use(ICU).use(initReactI18next).init({
    resources: Object.fromEntries(Object.entries(resources).map(([l, r]) => [l, { [UIKIT_NS]: r }])),
    lng, fallbackLng: "en", interpolation: { escapeValue: false }, returnNull: false,
  });
  return inst;
}

/** Static markup of a component with the strings of the kit. */
export const html = (node: ReactNode, lng: keyof typeof resources = "en") =>
  renderToStaticMarkup(<I18nextProvider i18n={kitI18n(lng)}>{node}</I18nextProvider>);
