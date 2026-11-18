import { useEffect, useRef, useState } from 'react';
import { beatsInWindow, isMilestone, type Beat } from '../logic/metronome';

// Look-ahead scheduling: every 25 ms the beats of the next 100 ms are handed to the audio clock,
// which plays them exactly on time even when the page is busy.
const TICK_MS = 25;
const AHEAD_S = 0.1;

type Tone = 'beat' | 'accent' | 'milestone';

function tone(context: AudioContext, time: number, kind: Tone) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  // the milestone: lower and longer, clearly not a beat of the pattern
  oscillator.frequency.value = kind === 'milestone' ? 520 : kind === 'accent' ? 1320 : 880;
  const length = kind === 'milestone' ? 0.35 : 0.08;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(kind === 'milestone' ? 0.9 : 0.6, time + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(time);
  oscillator.stop(time + length + 0.02);
}

interface Run {
  /** Audio time of beat 0. */
  start: number;
  bpm: number;
}

/**
 * A beat on the audio clock, shared by the metronome and the counter with beat: start (needs a tap
 * on touch devices), stop, realign to another start, the last beat played and a flash per beat.
 */
export function useBeat(pattern: readonly string[]) {
  const context = useRef<AudioContext | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [beat, setBeat] = useState<Beat | null>(null);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const audio = context.current;
    if (!run || !audio) return;
    // from the start itself: a realigned start lies a moment in the past, its beat plays at once
    let scheduledUntil = run.start;
    const pending: Beat[] = [];
    const timer = window.setInterval(() => {
      const until = audio.currentTime + AHEAD_S;
      for (const next of beatsInWindow(run.start, run.bpm, scheduledUntil, until)) {
        const first = pattern.length > 0 && next.index % pattern.length === 0;
        tone(
          audio,
          Math.max(next.time, audio.currentTime),
          isMilestone(pattern, next.index) ? 'milestone' : first ? 'accent' : 'beat',
        );
        pending.push(next);
      }
      scheduledUntil = until;
    }, TICK_MS);
    let frame = requestAnimationFrame(function show() {
      while (pending.length > 0 && (pending[0]?.time ?? Infinity) <= audio.currentTime) {
        const due = pending.shift();
        if (due) {
          setBeat(due);
          setFlash(true);
          window.setTimeout(() => setFlash(false), 120);
        }
      }
      frame = requestAnimationFrame(show);
    });
    return () => {
      window.clearInterval(timer);
      cancelAnimationFrame(frame);
    };
  }, [run, pattern]);

  /** Started by a plain tap: touch browsers only allow audio after a completed tap. */
  async function start(bpm: number) {
    try {
      context.current ??= new AudioContext();
      await context.current.resume();
      setBeat(null);
      setError('');
      setRun({ start: context.current.currentTime + 0.05, bpm });
    } catch (reason) {
      setError(`Ton nicht verfügbar: ${String(reason)}`);
    }
  }

  return {
    running: run !== null,
    run,
    beat,
    flash,
    error,
    start,
    stop: () => setRun(null),
    /** Runs on from a new beat 0 (the beat count starts again there). */
    realign: (start: number) => setRun((current) => (current ? { ...current, start } : current)),
    /** A press time (performance clock, ms) on the audio clock; undefined before the first start. */
    toAudioTime: (pressedAt: number) => {
      const audio = context.current;
      return audio ? audio.currentTime - (performance.now() - pressedAt) / 1000 : undefined;
    },
  };
}
