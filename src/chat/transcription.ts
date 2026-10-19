/** What the composer does with the outcome of a recognition. */
export interface TranscriptionHandlers {
  busy(on: boolean): void;
  /** The recognized text goes into the composer. */
  text(text: string): void;
  /** Nothing was recognized. */
  empty(): void;
  /** The recognition failed: the reason and a way to try the same recording again. */
  failed(reason: string | undefined, retry: () => void): void;
}

/** Recognizes a recording (FTR.NAB.CHAT-0001 R20, design §3.1). A rejection of the
 * product is a failure the user may retry: the recording stays with the retry until
 * the toast is closed. `null` means the product has told the user itself. */
export async function transcribe(recording: Blob, recognize: (b: Blob) => Promise<string | null>, on: TranscriptionHandlers): Promise<void> {
  on.busy(true);
  let r: string | null;
  try {
    r = await recognize(recording);
  } catch (e) {
    on.busy(false);
    on.failed(e instanceof Error && e.message ? e.message : undefined, () => void transcribe(recording, recognize, on));
    return;
  }
  on.busy(false);
  if (r === null) return;
  if (!r) on.empty();
  else on.text(r);
}
