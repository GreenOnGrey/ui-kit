import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { Chat } from "./Chat";
import { MessageView, NOTICE_LINES } from "./MessageView";
import type { ChatMessage } from "./types";

const notice = (m: Partial<ChatMessage>): ChatMessage => ({ id: "n1", role: "assistant", variant: "notice", text: "**Analysis updated · revision 4**",
  createdAt: "2026-10-21T14:02:00", status: "done", mark: { icon: "plug", text: "Hammurapi" }, ...m });
const send = () => Promise.resolve();

// FTR.NAB.CHAT-0002 NW-01…NW-03, FTR.HMR.DISC-0001 design §3.2: the elements the products asked the kit for.
describe("a notice of a product", () => {
  it("NW-01, NW-02: is a card on the left with the mark of the product, without retry", () => {
    const out = html(<MessageView m={notice({ error: { text: "x", transient: true } })} busy={false} onRetry={() => {}} />);
    expect(out).toContain('class="m a notice"');
    expect(out).toContain("Hammurapi");
    expect(out).toContain("<b>Analysis updated · revision 4</b>");
    expect(out).not.toContain("Retry");
    expect(out).not.toContain("folded");
  });

  it("NW-03: a long text is folded with «Show in full»", () => {
    const long = Array.from({ length: NOTICE_LINES + 1 }, (_, i) => `line ${i}`).join("\n");
    const out = html(<MessageView m={notice({ text: long })} busy={false} />);
    expect(out).toContain('class="bub folded"');
    expect(out).toContain("Show in full");
  });

  it("the content of the product replaces the text and is never folded", () => {
    const out = html(<MessageView m={notice({ text: "x\n".repeat(20), content: <div className="card-of-product">card</div> })} busy={false} />);
    expect(out).toContain("card-of-product");
    expect(out).not.toContain("folded");
  });
});

describe("the empty conversation and the composer", () => {
  it("empty replaces the whole empty conversation", () => {
    const out = html(<Chat agentName="Ада" messages={[]} onSend={send} emptyHint="hint" empty={<div className="topic-draft">draft</div>} />);
    expect(out).toContain("topic-draft");
    expect(out).not.toContain("Hi, I am Ада");
    expect(out).not.toContain("hint");
  });

  it("placeholder replaces the placeholder of the composer", () => {
    expect(html(<Chat agentName="Ада" messages={[]} onSend={send} placeholder="What to revise?" />)).toContain('placeholder="What to revise?"');
    expect(html(<Chat agentName="Ада" messages={[]} onSend={send} />)).not.toContain("What to revise?");
  });
});
