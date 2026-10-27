import { describe, expect, it } from "vitest";
import { html } from "../testing";
import { MessageView, SubagentStep } from "./MessageView";
import type { ChatMessage, ChatSubagent } from "./types";

// FTR.NAB.CMN-0009 design §3.
const sub = (s: Partial<ChatSubagent>): ChatSubagent => ({ task: 1, description: "Ревью по стандартам", state: "running", tools: 3, ...s });
const answer = (steps: ChatMessage["steps"]): ChatMessage =>
  ({ id: "a", role: "assistant", text: "", createdAt: "2026-10-27T14:00:00", status: "streaming", steps });

describe("subagents", () => {
  it("SUB-17 is open with its rows while a task runs", () => {
    const out = html(<SubagentStep tasks={[sub({}), sub({ task: 2, description: "Ревью по спеке", state: "done", tools: 7, result: "OK" })]} />, "ru");
    expect(out).toContain("Субагенты · 2");
    expect(out).toContain("Ревью по стандартам");
    expect(out).toContain("3 инстр.");
    expect(out).toContain("работает");
    expect(out).toContain('class="spin"');
    expect(out).not.toContain("— готово");
  });

  it("SUB-17 folds when done and says what failed", () => {
    const done = html(<SubagentStep tasks={[sub({ state: "done" }), sub({ task: 2, state: "done" })]} />, "ru");
    expect(done).toContain("Субагенты · 2 — готово");
    expect(done).not.toContain("Ревью по стандартам");
    const failed = html(<SubagentStep tasks={[sub({ state: "done" }), sub({ task: 2, state: "failed", error: "429" })]} />, "ru");
    expect(failed).toContain("— 1 с ошибкой");
  });

  it("SUB-17 an aborted task says why: the turn was stopped, or its own reason", () => {
    const out = html(<SubagentStep tasks={[sub({ state: "aborted" }), sub({ task: 2, state: "aborted", error: "no place in the pod" })]} />, "ru");
    expect(out).toContain("Субагенты · 2 — 2 с ошибкой");
    const open = html(<SubagentStep tasks={[sub({}), sub({ task: 2, state: "aborted", error: "no place in the pod" })]} />, "ru");
    expect(open).toContain("прервано<");
    expect(open).toContain("no place in the pod");
    const stopped = html(<SubagentStep tasks={[sub({}), sub({ task: 2, state: "aborted" })]} />, "ru");
    expect(stopped).toContain("прервано · ход остановлен");
  });

  it("SUB-17 a step without tasks stays a plain step of a tool", () => {
    const plain = html(<MessageView m={answer([{ id: "s", text: "subagent", status: "error" }])} busy={false} />);
    expect(plain).toContain('class="tool"');
    expect(plain).not.toContain("subagents");
    const withTasks = html(<MessageView m={answer([{ id: "s", text: "subagent", status: "running", subagents: [sub({})] }])} busy={false} />);
    expect(withTasks).toContain('class="tool subagents open"');
  });
});
