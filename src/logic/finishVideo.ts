// Zielvideo (Tobias 2026-11-11: „Stoppuhr mit Zieleinlauf: können wir das Ziel aufnehmen?“ – „Mit
// Kennzeichnung der Stopp Druck stellen?“ – „ok“): while the camera runs, the last moments are kept;
// each press on „Zieleinlauf“ keeps the frames from shortly before to shortly after it, the press
// marked, so the examiner can step to the frame where the athlete crosses the line and take its
// time – only where the camera tells when it took the picture (Tobias: „Wenn das ohne Verfälschung
// der Messung geht“). Frames live only in memory, never in the file. Generic over the picture (a Blob in the app),
// times on one clock (the browser's performance clock in the app), so it is tested without a camera.

/** The frames kept around a press on „Zieleinlauf“. */
export const FINISH_WINDOW = { beforeMs: 2000, afterMs: 1000 } as const;
/** At most this many finishes keep pictures (memory of a phone); later ones are named, not lost. */
export const MAX_CLIPS = 20;
/**
 * Frames closer than this are skipped. Below a 30-fps camera's 33 ms (with jitter), so such a
 * camera keeps every frame; a 60-fps one keeps every other (40 ms let a 30-fps camera keep only
 * every other frame – 67 ms between pictures, regression test).
 */
export const MIN_FRAME_GAP_MS = 25;

export interface Frame<T> {
  /** When the picture was taken. */
  readonly at: number;
  /**
   * `at` is the camera's own capture time. Otherwise it is when the picture reached the page – late
   * by the camera's delay, which nobody knows – and its time must not replace a measured one.
   */
  readonly exact: boolean;
  readonly image: T;
}

export interface FinishClip<T> {
  /** Index of the finish time in the stopwatch. */
  readonly finishIndex: number;
  /** When „Zieleinlauf“ was pressed. */
  readonly pressAt: number;
  /** The stopwatch's elapsed milliseconds at the press (the recorded finish time). */
  readonly pressElapsed: number;
  readonly frames: readonly Frame<T>[];
  /** All frames up to `afterMs` after the press are in. */
  readonly complete: boolean;
}

export interface FinishVideo<T> {
  /** The last `beforeMs` of pictures, oldest first. */
  readonly recent: readonly Frame<T>[];
  readonly clips: readonly FinishClip<T>[];
  /** Finish indexes pressed while `MAX_CLIPS` clips were kept: these have no pictures. */
  readonly withoutPictures: readonly number[];
}

export function emptyVideo<T>(): FinishVideo<T> {
  return { recent: [], clips: [], withoutPictures: [] };
}

/**
 * True when a picture taken `at` is worth keeping: not closer than MIN_FRAME_GAP_MS to the last one
 * taken (`lastAt` — pictures are encoded asynchronously, so the caller counts what it took).
 */
export function isFrameDue(lastAt: number | undefined, at: number): boolean {
  return lastAt === undefined || at - lastAt >= MIN_FRAME_GAP_MS;
}

/** A camera's capture time is trusted only this far before the frame callback. */
export const CAPTURE_TIME_TRUST_MS = 500;

/**
 * When a picture was taken: the camera's capture time where the browser gives one on the same clock
 * (it is earlier than the moment the frame reaches the page) – exact; else the moment of the
 * callback – not exact, only good for showing the pictures in order.
 */
export function pictureTime(
  callbackAt: number,
  captureTime: number | undefined,
): { at: number; exact: boolean } {
  return captureTime !== undefined &&
    captureTime <= callbackAt &&
    callbackAt - captureTime <= CAPTURE_TIME_TRUST_MS
    ? { at: captureTime, exact: true }
    : { at: callbackAt, exact: false };
}

/**
 * The time of this picture may replace the measured finish: only a camera capture time is at least
 * as exact as the press (the time between two pictures stays: the line is crossed between them).
 */
export function canTakeTime<T>(frame: Frame<T>): boolean {
  return frame.exact;
}

/** Inserts in time order – pictures may be finished out of order. */
function inOrder<T>(frames: readonly Frame<T>[], frame: Frame<T>): Frame<T>[] {
  const index = frames.findIndex((entry) => entry.at > frame.at);
  return index < 0
    ? [...frames, frame]
    : [...frames.slice(0, index), frame, ...frames.slice(index)];
}

/** A new picture: into the rolling buffer and into every clip whose window it falls in. */
export function addFrame<T>(video: FinishVideo<T>, frame: Frame<T>): FinishVideo<T> {
  const recent = inOrder(video.recent, frame);
  const newest = recent[recent.length - 1]?.at ?? frame.at;
  const clips = video.clips.map((clip) => {
    if (clip.complete) return clip;
    if (frame.at > clip.pressAt + FINISH_WINDOW.afterMs) return { ...clip, complete: true };
    if (frame.at < clip.pressAt - FINISH_WINDOW.beforeMs) return clip;
    return { ...clip, frames: inOrder(clip.frames, frame) };
  });
  return {
    ...video,
    recent: recent.filter((entry) => entry.at >= newest - FINISH_WINDOW.beforeMs),
    clips,
  };
}

/** A press on „Zieleinlauf“: keeps the pictures of the last `beforeMs`, the rest follow. */
export function markFinish<T>(
  video: FinishVideo<T>,
  finishIndex: number,
  pressAt: number,
  pressElapsed: number,
): FinishVideo<T> {
  if (video.clips.length >= MAX_CLIPS) {
    return { ...video, withoutPictures: [...video.withoutPictures, finishIndex] };
  }
  const frames = video.recent.filter((frame) => frame.at >= pressAt - FINISH_WINDOW.beforeMs);
  const clip: FinishClip<T> = { finishIndex, pressAt, pressElapsed, frames, complete: false };
  return { ...video, clips: [...video.clips, clip] };
}

/** The camera stops: no rolling buffer any more; clips still waiting for pictures end here. */
export function stopRecording<T>(video: FinishVideo<T>): FinishVideo<T> {
  return { ...video, recent: [], clips: video.clips.map((clip) => ({ ...clip, complete: true })) };
}

export function clipFor<T>(video: FinishVideo<T>, finishIndex: number): FinishClip<T> | undefined {
  return video.clips.find((clip) => clip.finishIndex === finishIndex);
}

/** The stopwatch time a picture shows: the press time moved by the picture's distance to it. */
export function frameElapsed<T>(clip: FinishClip<T>, frame: Frame<T>): number {
  return Math.max(0, clip.pressElapsed + (frame.at - clip.pressAt));
}

/** The picture nearest to the press (the marked one); -1 without pictures. */
export function pressFrameIndex<T>(clip: FinishClip<T>): number {
  let best = -1;
  clip.frames.forEach((frame, index) => {
    const current = clip.frames[best];
    if (!current || Math.abs(frame.at - clip.pressAt) < Math.abs(current.at - clip.pressAt)) {
      best = index;
    }
  });
  return best;
}
