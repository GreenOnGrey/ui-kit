import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { AgentButton, AgentMenu } from "./AgentMenu";
import { Chat } from "./Chat";
import { ConversationList } from "./ConversationList";
import { MessageView, markTime, visibleSteps } from "./MessageView";
import type { ChatMessage, ChatStep } from "./types";

const msg = (m: Partial<ChatMessage>): ChatMessage => ({ id: "m1", role: "user", text: "Hello", createdAt: "2026-10-11T14:02:00", status: "done", ...m });
const steps = (n: number): ChatStep[] => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, text: `step ${i}`, status: "done" }));
const send = () => Promise.resolve();

const list = (open: boolean, onCreate?: (t: string) => Promise<void>) => html(
  <ConversationList open={open} currentId="1" onPick={() => {}} onClose={() => {}} onCreate={onCreate} conversations={[
    { id: "1", group: "main", title: "Main", when: "now" },
    { id: "2", group: "topic", title: "Release", unread: 2, icon: "mail" },
    { id: "3", group: "archive", title: "Old" },
  ]} />,
);

describe("message", () => {
  it("CHAT-05 folds more than three steps to the last two", () => {
    expect(visibleSteps(steps(3), false)).toHaveLength(3);
    expect(visibleSteps(steps(5), false).map((s) => s.id)).toEqual(["s3", "s4"]);
    expect(visibleSteps(steps(5), true)).toHaveLength(5);
    const out = html(<MessageView m={msg({ role: "assistant", steps: steps(5) })} busy={false} />);
    expect(out).toContain("3 more steps");
    expect(out.match(/class="tool"/g)).toHaveLength(2);
  });

  it("CHAT-06 has a caption only with a mark, the time in the language of the interface", () => {
    expect(html(<MessageView m={msg({})} busy={false} />)).toBe('<div class="m u"><div class="bub">Hello</div></div>');
    const out = html(<MessageView m={msg({ mark: { icon: "tg", text: "Telegram" } })} busy={false} />);
    expect(out).toContain('<div class="chan">');
    expect(out).toContain(` Telegram · ${markTime("2026-10-11T14:02:00", "en")}`);
    expect(markTime("2026-10-11T14:02:00", "ru")).toBe("14:02");
  });

  it("CHAT-07 shows the state of the turn under the message of the user", () => {
    expect(html(<MessageView m={msg({ wait: { state: "starting" } })} busy={false} />))
      .toContain('<div class="turnstate" role="status"><span class="spin" aria-hidden="true"></span>The agent is starting…</div>');
    expect(html(<MessageView m={msg({ wait: { state: "queued", position: 2 } })} busy={false} />, "ru")).toContain("В очереди · перед вами 2");
  });

  it("CHAT-08 offers a retry only with a handler; a transient error is amber", () => {
    const failed = msg({ role: "assistant", text: "", status: "failed", error: { text: "Busy", transient: true } });
    const out = html(<MessageView m={failed} busy={false} onRetry={() => {}} />);
    expect(out).toContain('class="llmerr amber" role="alert"');
    expect(out).toContain("Retry");
    expect(html(<MessageView m={failed} busy={false} />)).not.toContain("Retry");
    expect(html(<MessageView m={{ ...failed, error: { text: "No key", transient: false } }} busy={false} />)).toContain('class="llmerr" role="alert"');
  });

  it("CHAT-15, CHAT-16 draws a note without a bubble and the content of the product inside a message", () => {
    expect(html(<MessageView m={msg({ role: "note", text: "Cancelled" })} busy={false} />)).toBe('<div class="sysnote">Cancelled</div>');
    const out = html(<MessageView m={msg({ role: "assistant", text: "", content: <div className="digest">D</div> })} busy={false} />);
    expect(out).toBe('<div class="m a"><div class="digest">D</div></div>');
  });

  it("shows the typing mark while the answer has no text", () => {
    expect(html(<MessageView m={msg({ role: "assistant", text: "", status: "streaming" })} busy />)).toContain('class="typing" aria-label="The agent is typing"');
  });
});

describe("chat", () => {
  it("CHAT-13 has no control without its handler", () => {
    const out = html(<Chat agentName="Ada" messages={[msg({})]} onSend={send} busy />);
    for (const label of ["Attach files", "Hold to record", "Stop", "Earlier messages", "Confirm the action"]) expect(out, label).not.toContain(label);
    expect(out).toContain('aria-label="Send" disabled=""');
  });

  it("CHAT-14 shows the cancel button and the confirmations when the product handles them", () => {
    const out = html(
      <Chat agentName="Ada" messages={[msg({})]} onSend={send} busy onCancel={() => {}} onUpload={async () => null} onTranscribe={async () => null}
        hasOlder onLoadOlder={() => {}} confirmations={[{ id: "c1", summary: "send a letter", preview: "{}" }]} onConfirm={() => {}} />,
    );
    expect(out).toContain('class="iconbtn fill" aria-label="Stop"');
    expect(out).not.toContain('aria-label="Send"');
    expect(out).toContain("The agent wants to perform: send a letter");
    expect(out).toContain("<pre>{}</pre>");
    for (const label of ["Attach files", "Earlier messages", "Execute", "Reject"]) expect(out, label).toContain(label);
  });

  it("CHAT-17 shows the reason instead of the composer when one cannot write", () => {
    const out = html(<Chat agentName="Ada" messages={[]} onSend={send} readOnly={<span>Archived</span>} />);
    expect(out).toContain("<span>Archived</span>");
    expect(out).not.toContain("<textarea");
  });

  it("CHAT-16 puts the content of the product over the composer", () => {
    const out = html(<Chat agentName="Ada" messages={[]} onSend={send} aboveComposer={<div className="modes" />} />);
    expect(out.indexOf('class="modes"')).toBeLessThan(out.indexOf('class="composer"'));
  });

  it("greets in an empty conversation and names the agent in the composer", () => {
    const out = html(<Chat agentName="Ada" messages={[]} onSend={send} emptyHint="Ask me" />);
    expect(out).toContain("<b>Hi, I am Ada</b>Ask me");
    expect(out).toContain('placeholder="Message Ada…"');
    expect(html(<Chat agentName="Ada" messages={[]} onSend={send} loading />)).not.toContain("Hi, I am");
  });
});

describe("conversations", () => {
  it("CHAT-18 groups the conversations and marks the current and the unread", () => {
    const out = list(false);
    expect(out).toContain('<button class="it on" aria-current="true">');
    expect(out).toContain('<span class="unread" aria-label="2 unread answers">2</span>');
    expect(out).toContain('class="it arch"');
    expect(out).not.toContain("nb-scrim");
    expect(out).not.toContain("New topic");
  });

  it("lies over the messages while open and offers a new topic with a handler", () => {
    const out = list(true, send);
    expect(out).toContain('class="nb-side open"');
    expect(out).toContain('class="nb-scrim" aria-label="Close"');
    expect(out).toContain("New topic");
  });
});

describe("the menu of the agent", () => {
  const menu = html(
    <AgentMenu label="Agent" name="Ada" value="b" optionsLabel="Manner" hint="Everywhere" onRename={() => {}} onPick={() => {}} onClose={() => {}}
      options={[{ key: "a", label: "Plain", icon: "tBusiness" }, { key: "b", label: "Short", icon: "tBrief" }]} />,
  );

  it("shows the name and the options of the product, the chosen one pressed", () => {
    expect(menu).toContain('class="agentmenu" role="dialog" aria-label="Agent"');
    expect(menu).toContain('aria-label="Agent name"');
    expect(menu).toContain('value="Ada"');
    expect(menu).toContain('class="agentoption" aria-pressed="false"');
    expect(menu).toContain('class="agentoption on" aria-pressed="true"');
    expect(menu).toContain("Manner");
    expect(menu).toContain("Everywhere");
  });

  it("AgentButton is named and tells whether its menu is open", () => {
    expect(html(<AgentButton icon="tBrief" label="Agent" expanded small />)).toContain('class="agentbtn s" aria-label="Agent" aria-expanded="true"');
  });
});
