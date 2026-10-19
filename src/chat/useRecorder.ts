import { useCallback, useEffect, useRef, useState } from "react";

/** Recording with MediaRecorder (FTR.NAB.CHAT-0001 R20): started and stopped
 * by the user, stopped by itself at `maxSeconds`; the level of the voice is
 * sampled for the bar of the recording. */
export function useRecorder(maxSeconds = 300, onLimit?: () => void) {
  const supported = typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia;
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const audio = useRef<AudioContext | null>(null);
  const stopped = useRef<((b: Blob | null) => void) | null>(null);
  const discard = useRef(false);
  const limit = useRef(onLimit);
  useEffect(() => {
    limit.current = onLimit;
  });

  const cleanup = useCallback(() => {
    window.clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach((tr) => tr.stop());
    rec.current = null;
    void audio.current?.close().catch(() => undefined);
    audio.current = null;
    setRecording(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (!supported || rec.current) return;
    setError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      discard.current = false;
      r.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      r.onstop = () => {
        const blob = !discard.current && chunks.current.length ? new Blob(chunks.current, { type: r.mimeType || "audio/webm" }) : null;
        cleanup();
        stopped.current?.(blob);
        stopped.current = null;
      };
      let analyser: AnalyserNode | null = null;
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          audio.current = new Ctx();
          analyser = audio.current.createAnalyser();
          analyser.fftSize = 256;
          audio.current.createMediaStreamSource(stream).connect(analyser);
        }
      } catch {
        analyser = null; // the bar stays flat without Web Audio
      }
      const samples = analyser ? new Uint8Array(analyser.fftSize) : null;
      rec.current = r;
      r.start();
      setSeconds(0);
      setRecording(true);
      const began = Date.now();
      let limited = false;
      timer.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - began) / 1000);
        setSeconds(s);
        if (analyser && samples) {
          analyser.getByteTimeDomainData(samples);
          let peak = 0;
          for (const v of samples) peak = Math.max(peak, Math.abs(v - 128));
          setLevel(Math.min(1, peak / 64));
        }
        if (s >= maxSeconds && !limited) {
          limited = true;
          limit.current?.();
        }
      }, 100);
    } catch {
      setError(true);
      cleanup();
    }
  }, [supported, cleanup, maxSeconds]);

  const stop = useCallback(() => new Promise<Blob | null>((resolve) => {
    const r = rec.current;
    if (!r || r.state === "inactive") return resolve(null);
    stopped.current = resolve;
    r.stop();
  }), []);

  /** Ends the recording and drops it. */
  const cancel = useCallback(() => {
    discard.current = true;
    void stop();
  }, [stop]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { supported, recording, seconds, level, error, start, stop, cancel };
}

/** m:ss of a number of seconds. */
export function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
