import { useTranslation } from "react-i18next";

/** The namespace of the strings of the kit in the i18next instance of a product
 * (FTR.NAB.CMN-0005 arch §4.1): `resources[lng].uikit = kit[lng]`. */
export const UIKIT_NS = "uikit";

/** `t` of the strings of the kit. */
export const useKitT = () => useTranslation(UIKIT_NS).t;
