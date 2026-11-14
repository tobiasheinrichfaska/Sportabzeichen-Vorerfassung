// Zielvideo: the frames around each press on „Zieleinlauf“, the press marked, the time of a frame.
// Pictures are plain strings here; times on one invented clock.
import {
  CAPTURE_TIME_TRUST_MS,
  FINISH_WINDOW,
  MAX_CLIPS,
  MIN_FRAME_GAP_MS,
  addFrame,
  canTakeTime,
  clipFor,
  emptyVideo,
  frameElapsed,
  isFrameDue,
  markFinish,
  pictureTime,
  pressFrameIndex,
  stopRecording,
  type FinishVideo,
} from '../../src/logic/finishVideo';
import {
  STOPWATCH_RESET,
  finishStopwatch,
  setFinish,
  startStopwatch,
} from '../../src/logic/stopwatch';

/** A camera delivering one frame every `step` ms from `from` to `to` (inclusive). */
function film(video: FinishVideo<string>, from: number, to: number, step = 40) {
  let current = video;
  for (let at = from; at <= to; at += step) {
    current = addFrame(current, { at, exact: true, image: `f${at}` });
  }
  return current;
}

describe('rolling buffer', () => {
  it('keeps only the last beforeMs of pictures', () => {
    const video = film(emptyVideo(), 0, 10_000);
    expect(video.recent[0]?.at).toBeGreaterThanOrEqual(10_000 - FINISH_WINDOW.beforeMs);
    expect(video.recent.at(-1)?.at).toBe(10_000);
  });

  it('skips pictures closer than MIN_FRAME_GAP_MS to the last one taken', () => {
    expect(isFrameDue(0, MIN_FRAME_GAP_MS - 1)).toBe(false);
    expect(isFrameDue(0, MIN_FRAME_GAP_MS)).toBe(true);
    expect(isFrameDue(undefined, 0)).toBe(true);
  });

  // regression: with 40 ms a 30-fps camera (33 ms) kept only every other frame – 67 ms apart
  it('a 30-fps camera keeps every frame, also with a few ms of jitter', () => {
    const jitter = [0, 3, -3, 2, -2, 1];
    let lastAt: number | undefined;
    let kept = 0;
    for (let i = 0; i < 60; i++) {
      const at = (i * 1000) / 30 + (jitter[i % jitter.length] ?? 0);
      if (isFrameDue(lastAt, at)) {
        lastAt = at;
        kept++;
      }
    }
    expect(kept).toBe(60);
  });

  it('a 60-fps camera keeps every other frame (about 30 per second are enough)', () => {
    let lastAt: number | undefined;
    let kept = 0;
    for (let i = 0; i < 60; i++) {
      const at = (i * 1000) / 60;
      if (isFrameDue(lastAt, at)) {
        lastAt = at;
        kept++;
      }
    }
    expect(kept).toBe(30);
  });

  it('the camera’s capture time where plausible is exact, else the callback time is not', () => {
    expect(pictureTime(1_000, 960)).toEqual({ at: 960, exact: true });
    expect(pictureTime(1_000, undefined)).toEqual({ at: 1_000, exact: false });
    // another clock (far off) or after the callback: not trusted
    expect(pictureTime(1_000, 1_000 - CAPTURE_TIME_TRUST_MS - 1)).toEqual({
      at: 1_000,
      exact: false,
    });
    expect(pictureTime(1_000, 1_010)).toEqual({ at: 1_000, exact: false });
  });

  it('a picture finished out of order still lands in time order', () => {
    let video = addFrame(emptyVideo<string>(), { at: 100, exact: true, image: 'b' });
    video = addFrame(video, { at: 60, exact: true, image: 'a' });
    expect(video.recent.map((f) => f.image)).toEqual(['a', 'b']);
  });
});

describe('a press on „Zieleinlauf“', () => {
  it('keeps the pictures from beforeMs before to afterMs after the press', () => {
    let video = film(emptyVideo(), 0, 5_000);
    video = markFinish(video, 0, 5_000, 8_430);
    video = film(video, 5_040, 7_000);
    const clip = clipFor(video, 0);
    expect(clip?.complete).toBe(true);
    expect(clip?.frames[0]?.at).toBe(5_000 - FINISH_WINDOW.beforeMs);
    expect(clip?.frames.at(-1)?.at).toBe(5_000 + FINISH_WINDOW.afterMs);
    // the rolling buffer moved on, the clip keeps its pictures
    expect(video.recent[0]?.at).toBe(7_000 - FINISH_WINDOW.beforeMs);
  });

  it('waits for the pictures after the press', () => {
    let video = film(emptyVideo(), 0, 5_000);
    video = markFinish(video, 0, 5_000, 8_430);
    video = film(video, 5_040, 5_400);
    expect(clipFor(video, 0)?.complete).toBe(false);
  });

  it('two runners close together share pictures in both clips', () => {
    let video = film(emptyVideo(), 0, 5_000);
    video = markFinish(video, 0, 5_000, 8_430);
    video = film(video, 5_040, 5_200);
    video = markFinish(video, 1, 5_200, 8_630);
    video = film(video, 5_240, 7_000);
    const both = video.clips.map((clip) => clip.frames.some((f) => f.at === 5_120));
    expect(both).toEqual([true, true]);
  });

  it('a press before the camera ran has no earlier pictures, only those after it', () => {
    let video = markFinish(emptyVideo<string>(), 0, 1_000, 9_000);
    video = film(video, 1_040, 2_500);
    expect(clipFor(video, 0)?.frames[0]?.at).toBe(1_040);
  });

  it(`after ${MAX_CLIPS} clips the next finishes are named without pictures, not dropped`, () => {
    let video = film(emptyVideo(), 0, 100);
    for (let i = 0; i < MAX_CLIPS + 2; i++) video = markFinish(video, i, 100, 1_000 + i);
    expect(video.clips).toHaveLength(MAX_CLIPS);
    expect(video.withoutPictures).toEqual([MAX_CLIPS, MAX_CLIPS + 1]);
  });

  it('switching the camera off ends waiting clips and clears the buffer', () => {
    let video = film(emptyVideo(), 0, 3_000);
    video = markFinish(video, 0, 3_000, 8_000);
    video = stopRecording(video);
    expect(video.recent).toEqual([]);
    expect(clipFor(video, 0)).toMatchObject({ complete: true });
    expect(clipFor(video, 0)?.frames.length).toBeGreaterThan(0);
  });
});

describe('the time of a picture', () => {
  it('the press time moved by the picture’s distance to the press', () => {
    let video = film(emptyVideo(), 0, 5_000);
    video = markFinish(video, 0, 5_000, 8_430);
    const clip = clipFor(video, 0);
    if (!clip) throw new Error('clip');
    const before = clip.frames.find((f) => f.at === 4_880);
    if (!before) throw new Error('frame');
    expect(frameElapsed(clip, before)).toBe(8_310);
  });

  it('never below zero', () => {
    const clip = { finishIndex: 0, pressAt: 1_000, pressElapsed: 100, frames: [], complete: true };
    expect(frameElapsed(clip, { at: 0, exact: true, image: 'x' })).toBe(0);
  });

  // Tobias: „Wenn das ohne Verfälschung der Messung geht“ – a picture timed when it reached the
  // page is late by the camera's unknown delay, so its time never replaces the pressed one
  it('only a picture with the camera’s capture time may replace the measured finish', () => {
    expect(canTakeTime({ at: 960, exact: true, image: 'x' })).toBe(true);
    expect(canTakeTime({ at: 1_000, exact: false, image: 'x' })).toBe(false);
    const { at, exact } = pictureTime(1_000, undefined);
    expect(canTakeTime({ at, exact, image: 'x' })).toBe(false);
  });

  it('the marked picture is the one nearest to the press', () => {
    let video = film(emptyVideo(), 0, 4_990);
    video = markFinish(video, 0, 5_010, 8_000);
    video = film(video, 5_030, 6_500);
    const clip = clipFor(video, 0);
    if (!clip) throw new Error('clip');
    // frames at …, 4 960 (50 ms before) and 5 030 (20 ms after the press at 5 010)
    expect(clip.frames[pressFrameIndex(clip)]?.at).toBe(5_030);
    expect(pressFrameIndex({ ...clip, frames: [] })).toBe(-1);
  });
});

describe('taking the time of a picture', () => {
  it('replaces that finish only', () => {
    let state = startStopwatch(STOPWATCH_RESET, 0);
    state = finishStopwatch(state, 8_430);
    state = finishStopwatch(state, 9_120);
    expect(setFinish(state, 0, 8_310).finishes).toEqual([8_310, 9_120]);
    expect(setFinish(state, 5, 1).finishes).toEqual([8_430, 9_120]);
    expect(setFinish(state, 1, -3).finishes).toEqual([8_430, 0]);
  });
});
