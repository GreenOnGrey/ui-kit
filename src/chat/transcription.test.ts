import { describe, expect, it } from "vitest";
import { transcribe, type TranscriptionHandlers } from "./transcription";

function recorder() {
  const log: string[] = [];
  let retry: (() => void) | undefined;
  const on: TranscriptionHandlers = {
    busy: (b) => log.push(b ? "busy" : "idle"),
    text: (x) => log.push(`text:${x}`),
    empty: () => log.push("empty"),
    failed: (reason, again) => {
      log.push(`failed:${reason ?? ""}`);
      retry = again;
    },
  };
  return { log, on, retry: () => retry?.() };
}

describe("transcription (FTR.NAB.CHAT-0001 R20, design §3.1)", () => {
  it("puts the text, tells about silence and leaves the told failure to the product", async () => {
    for (const [answer, want] of [["привет", "text:привет"], ["", "empty"], [null, undefined]] as const) {
      const r = recorder();
      await transcribe(new Blob(["v"]), async () => answer, r.on);
      expect(r.log).toEqual(want ? ["busy", "idle", want] : ["busy", "idle"]);
    }
  });

  it("FTR.NAB.CHAT-0001 VOC-14 offers to retry the same recording after a failure", async () => {
    const r = recorder();
    const seen: Blob[] = [];
    let fail = true;
    const blob = new Blob(["voice"]);
    await transcribe(blob, async (b) => {
      seen.push(b);
      if (fail) throw new Error("The recognizer is not available");
      return "готово";
    }, r.on);
    expect(r.log).toEqual(["busy", "idle", "failed:The recognizer is not available"]);
    fail = false;
    r.retry();
    await new Promise((ok) => setTimeout(ok, 0));
    expect(seen).toEqual([blob, blob]);
    expect(r.log.at(-1)).toBe("text:готово");
  });
});
