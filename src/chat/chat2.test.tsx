import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { AgentMenu } from "./AgentMenu";
import { CommandPalette, matchCommands } from "./CommandPalette";
import { ContextMeter, tokens } from "./ContextMeter";
import { MessageView } from "./MessageView";
import type { ChatCommand } from "./types";

// FTR.NAB.CHAT-0001 design §3.1–3.3.
const commands: ChatCommand[] = [
  { kind: "command", name: "new", description: "Start with a clean context" },
  { kind: "command", name: "compact", description: "Compact the context", takesText: true },
  { kind: "skill", name: "contract-review", description: "Check a contract", source: "Lawyers" },
  { kind: "skill", name: "weekly-report", description: "Weekly report", source: "Reports" },
];

describe("palette", () => {
  it("SKL-01 lists the commands and the skills and filters them by what is typed", () => {
    expect(matchCommands(commands, "")).toHaveLength(4);
    expect(matchCommands(commands, "comp").map((c) => c.name)).toEqual(["compact"]);
    expect(matchCommands(commands, "report").map((c) => c.name)).toEqual(["weekly-report"]);
    const out = html(<CommandPalette items={commands} active={2} onPick={() => {}} onHover={() => {}} />);
    expect(out).toContain("Commands");
    expect(out).toContain("/new");
    expect(out).toContain("contract-review");
    expect(out).toContain("Lawyers");
    expect(out.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(out).toMatch(/palette-row on"[^>]*><svg/); // the active row is the first skill
  });

  it("SKL-01 says when nothing matches and when there are no skills", () => {
    expect(html(<CommandPalette items={[]} active={0} onPick={() => {}} onHover={() => {}} />)).toContain("Nothing found");
    expect(html(<CommandPalette items={commands.slice(0, 2)} active={0} onPick={() => {}} onHover={() => {}} />, "ru"))
      .toContain("Вам не выдан ни один скилл");
  });
});

describe("context", () => {
  it("CTX-10 is grey, amber from 70 % and red from 90 %", () => {
    expect(html(<ContextMeter context={{ tokens: 0, window: 1000 }} />)).toContain('class="ctxring "');
    expect(html(<ContextMeter context={{ tokens: 700, window: 1000 }} />)).toContain('class="ctxring warn"');
    const full = html(<ContextMeter context={{ tokens: 912_000, window: 1_000_000 }} />);
    expect(full).toContain('class="ctxring full"');
    expect(full).toContain("Context: 912K of 1M tokens (91%)");
  });

  it("writes tokens shortly in the language of the interface", () => {
    expect(tokens(42_000, "en")).toBe("42K");
    expect(tokens(1_200_000, "en")).toBe("1.2M");
    expect(tokens(42_000, "ru")).toMatch(/^42\s?тыс\.$/);
  });
});

describe("events", () => {
  it("draws an event as a divider with its time and the summary folded", () => {
    const out = html(<MessageView m={{ id: "e", role: "event", text: "", createdAt: "2026-10-11T14:05:00", status: "done",
      event: { icon: "compress", text: "Context compacted: 182K → 9K tokens", details: "The contract…" } }} busy={false} />);
    expect(out).toContain('class="evdiv"');
    expect(out).toContain("Context compacted: 182K → 9K tokens");
    expect(out).toContain("Summary ▾");
    expect(out).not.toContain("The contract…");
  });
});

describe("agent menu", () => {
  it("SEL-04 shows the models after the options; one model without a choice; none — the text of the product", () => {
    const base = { label: "Agent", name: "Nabu", options: [], value: "", optionsLabel: "Tone", onRename: () => {}, onPick: () => {}, onClose: () => {} };
    const two = html(<AgentMenu {...base} models={{ label: "Model", value: "b", onPick: () => {}, options: [
      { key: "a", label: "Default", sub: "DeepSeek V4.1 Flash" },
      { key: "b", label: "GigaChat 2 Max", sub: "GigaChat", badges: [{ icon: "image", text: "images" }], warn: "The context will be compacted" },
    ] }} />);
    expect(two).toContain("Model");
    expect(two).toContain('aria-checked="true"');
    expect(two).toContain("images");
    expect(two).toContain("The context will be compacted");
    const one = html(<AgentMenu {...base} models={{ label: "Model", value: "a", onPick: () => {}, options: [{ key: "a", label: "Only" }] }} />);
    expect(one).not.toContain('class="radio');
    expect(html(<AgentMenu {...base} models={{ label: "Model", value: "", onPick: () => {}, options: [], empty: "No models" }} />)).toContain("No models");
  });
});
