import { describe, expect, it } from "vitest";
import { html, kitI18n } from "../testing";
import { AgentSettingsMenu, agentModelOptions, type AgentModel, type AgentModelState } from "./AgentSettingsMenu";

// FTR.HMR.SPEC-0001: one menu of the agent for every product.
const model = (name: string, window: number, image = false): AgentModel => ({
  connectionId: "c1", model: name, name, connection: "DeepSeek", caps: { image, reasoning: true, contextWindow: window },
});
const flash = model("flash", 128_000, true);
const pro = model("pro", 1_000_000);
const state = (s: Partial<AgentModelState>): AgentModelState => ({
  available: [flash, pro], model: flash, defaultModel: flash, chosen: false, contextTokens: 0, ...s,
});
const base = { name: "Nabu", value: "a", options: [{ key: "a", label: "A", icon: "bolt" as const }, { key: "b", label: "B", icon: "book" as const }],
  onRename: () => {}, onPick: () => {}, onClose: () => {} };
const t = kitI18n("en").getFixedT("en", "uikit");

describe("the menu of the agent of every product (AGM)", () => {
  it("AGM-01 starts a choice with the default model and marks the chosen one", () => {
    const { options, value } = agentModelOptions(t, "en", state({ model: pro, chosen: true }));
    expect(options.map((o) => o.label)).toEqual(["Default", "flash", "pro"]);
    expect(options[0].sub).toBe("flash");
    expect(options[1].badges?.map((b) => b.text)).toContain("images");
    expect(value).toBe("c1/pro");
    expect(agentModelOptions(t, "en", state({})).value).toBe("");
  });

  it("AGM-02 warns of a window the context outgrows; one model is no choice", () => {
    const small = model("small", 10_000);
    const { options } = agentModelOptions(t, "en", state({ available: [small, pro], defaultModel: pro, contextTokens: 9_000 }));
    expect(options.find((o) => o.label === "small")?.warn).toBe("The context will be compacted before the next answer");
    expect(options.find((o) => o.label === "pro")?.warn).toBeUndefined();
    const single = agentModelOptions(t, "en", state({ available: [small], model: small }));
    expect(single.options.map((o) => o.label)).toEqual(["small"]);
    expect(single.value).toBe("c1/small");
  });

  it("AGM-03 draws the strings of the kit, the options in two columns and the model block", () => {
    const out = html(<AgentSettingsMenu {...base} models={state({})} onModel={() => {}} />, "ru");
    expect(out).toContain('aria-label="Агент"');
    expect(out).toContain("Тон");
    expect(out).toContain("Модель");
    expect(out).toContain("По умолчанию");
    expect(out).toContain("Изменение действует во всех каналах и подключённых сервисах.");
    expect(out).toContain('class="agentmenu"');
  });

  it("AGM-04 without models there is no model block; the hint of the product replaces the kit's", () => {
    const out = html(<AgentSettingsMenu {...base} hint="Saved in the profile" />);
    expect(out).not.toContain("Model");
    expect(out).toContain("Saved in the profile");
    expect(out).not.toContain("every channel");
  });
});
