import { describe, expect, it } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";
import { kitI18n } from "../testing";
import { UIKIT_NS } from "../i18n";
import { resources } from "./index";

type Tree = { [k: string]: string | Tree };

function flatten(t: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

const en = flatten(resources.en);

// KIT-08: the strings of the kit in the five languages of the products.
describe("locales (KIT-08)", () => {
  for (const [lng, tree] of Object.entries(resources)) {
    const msgs = flatten(tree as Tree);
    it(`${lng} has exactly the English keys`, () => {
      expect(Object.keys(msgs).toSorted()).toEqual(Object.keys(en).toSorted());
    });
    it(`${lng} messages are valid ICU`, () => {
      for (const [key, msg] of Object.entries(msgs)) {
        expect(() => new IntlMessageFormat(msg, lng === "zh" ? "zh-CN" : lng), `${lng}:${key}`).not.toThrow();
      }
    });
    it(`${lng} names no product`, () => {
      for (const [key, msg] of Object.entries(msgs)) expect(msg, `${lng}:${key}`).not.toMatch(/nabu|hammurapi|набу|хаммурапи/i);
    });
  }

  it("uses Russian plural forms", () => {
    const t = kitI18n("ru").getFixedT("ru", UIKIT_NS);
    expect(t("chat.moreSteps", { count: 1 })).toBe("ещё 1 шаг");
    expect(t("chat.moreSteps", { count: 3 })).toBe("ещё 3 шага");
    expect(t("chat.moreSteps", { count: 5 })).toBe("ещё 5 шагов");
    expect(t("chat.wait.queued", { count: 0 })).toBe("В очереди · вы следующий");
  });

  it("takes the name of the agent as a parameter", () => {
    expect(kitI18n("en").getFixedT("en", UIKIT_NS)("chat.placeholder", { name: "Ada" })).toBe("Message Ada…");
  });
});
