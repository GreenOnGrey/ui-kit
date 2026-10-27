import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { Chat } from "./Chat";
import { MessageView } from "./MessageView";
import type { ChatMessage } from "./types";

// FTR.NAB.CHAT-0004 design §1, §3.
const msg = (m: Partial<ChatMessage>): ChatMessage => ({ id: "m1", role: "user", text: "Hello", createdAt: "2026-10-27T14:02:00", status: "done", ...m });
const send = () => Promise.resolve();
const writing = msg({ id: "a1", role: "assistant", text: "Half", status: "streaming" });

describe("queue", () => {
  it("QUE-01 keeps «Send» open while the agent answers and says the message will wait", () => {
    const out = html(<Chat agentName="Ada" allowQueue messages={[msg({}), writing]} onSend={send} />);
    expect(out).toContain('placeholder="The message will wait in the queue"');
    expect(out).toContain('aria-label="Send" disabled=""'); // only the empty field holds it
    const plain = html(<Chat agentName="Ada" messages={[msg({}), writing]} onSend={send} />);
    expect(plain).toContain('placeholder="Message Ada…"');
    expect(plain).toContain('aria-label="Send" disabled=""'); // without allowQueue the message waits for the answer
  });

  it("QUE-02 numbers the queued messages and offers to cancel them", () => {
    const out = html(<Chat agentName="Ada" allowQueue onCancelQueued={async () => {}} onSend={send}
      messages={[msg({}), writing, msg({ id: "q1", text: "One", queued: true }), msg({ id: "q2", text: "Two", queued: true })]} />, "ru");
    expect(out.match(/class="m u queued"/g)).toHaveLength(2);
    expect(out).toContain("В очереди · 1");
    expect(out).toContain("В очереди · 2");
    expect(out.match(/Отменить/g)).toHaveLength(2);
    const noCancel = html(<MessageView m={msg({ queued: true })} busy={false} queuePosition={1} />);
    expect(noCancel).toContain("In the queue · 1");
    expect(noCancel).not.toContain("Cancel");
  });

  it("QUE-14 holds the actions on the context while messages wait", () => {
    const out = html(<Chat agentName="Ada" allowQueue onSend={send} context={{ tokens: 950, window: 1000 }} onReset={() => {}}
      messages={[msg({ queued: true })]} />);
    expect(out).toContain('class="ctxring full"');
  });
});

describe("stop", () => {
  it("STP-12 puts «Stop» on the place of «Send» while an answer is written and the field is empty", () => {
    const out = html(<Chat agentName="Ada" allowQueue onStop={async () => {}} onSend={send} messages={[msg({}), writing]} />);
    expect(out).toContain('class="iconbtn stopbtn" aria-label="Stop the answer"');
    expect(out).not.toContain('aria-label="Send"');
    const done = html(<Chat agentName="Ada" allowQueue onStop={async () => {}} onSend={send} messages={[msg({}), { ...writing, status: "done" }]} />);
    expect(done).not.toContain("stopbtn");
    expect(done).toContain('aria-label="Send" disabled=""');
    const without = html(<Chat agentName="Ada" allowQueue onSend={send} messages={[msg({}), writing]} />);
    expect(without).not.toContain("stopbtn");
  });

  it("STP-06: a retry waiting in the queue replaces «Retry»", () => {
    const out = html(<MessageView m={{ ...writing, status: "stopped", retryQueued: true }} busy={false} onRetry={() => {}} />, "ru");
    expect(out).toContain("Повтор в очереди");
    expect(out).not.toContain(">Повторить<");
  });

  it("STP-12 says «Stopping…» instead of the typing mark, then «Stopped» with «Retry», grey", () => {
    const stopping = html(<MessageView m={{ ...writing, text: "" }} busy={false} stopping />);
    expect(stopping).toContain("Stopping…");
    expect(stopping).not.toContain('class="typing"');
    const stopped = html(<MessageView m={{ ...writing, status: "stopped" }} busy={false} onRetry={() => {}} />, "ru");
    expect(stopped).toContain('class="stopmark"');
    expect(stopped).toContain("Остановлено");
    expect(stopped).toContain("Повторить");
    expect(stopped).not.toContain("llmerr");
    expect(stopped).toContain("Half");
  });
});
