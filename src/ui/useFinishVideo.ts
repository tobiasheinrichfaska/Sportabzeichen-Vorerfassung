// The camera for the Zielvideo: lives in the app (like the stopwatch), so it keeps running while
// pages change. Takes small JPEG pictures of the camera's frames into memory; what to keep is the
// pure logic of finishVideo.ts. Nothing here is ever saved or sent anywhere.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addFrame,
  emptyVideo,
  isFrameDue,
  markFinish,
  pictureTime,
  stopRecording,
  type FinishVideo,
} from '../logic/finishVideo';

/** Pictures are taken at most this wide – enough to see the line, small in memory (~25 KB). */
const PICTURE_WIDTH = 480;
const JPEG_QUALITY = 0.7;

/** What the browser's refusal means for the examiner (DOMException names). */
const CAMERA_ERRORS: Readonly<Record<string, string>> = {
  NotAllowedError:
    'Die Kamera ist für diese Seite nicht erlaubt – in den Einstellungen des Browsers freigeben.',
  SecurityError: 'Die Kamera ist für diese Seite nicht erlaubt.',
  NotFoundError: 'Keine Kamera gefunden.',
  OverconstrainedError: 'Keine passende Kamera gefunden.',
  NotReadableError: 'Die Kamera wird gerade von einer anderen App benutzt.',
};

function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  return CAMERA_ERRORS[name] ?? `Die Kamera ließ sich nicht starten (${name || String(error)}).`;
}

export interface FinishVideoControl {
  readonly on: boolean;
  readonly starting: boolean;
  readonly error: string;
  readonly stream: MediaStream | null;
  readonly video: FinishVideo<Blob>;
  start: () => void;
  stop: () => void;
  /** A press on „Zieleinlauf“ (only while the camera runs). */
  mark: (finishIndex: number, pressAt: number, pressElapsed: number) => void;
  /** The stopwatch was reset: its pictures go. */
  clear: () => void;
}

/** True when what the page shows of the clips changed (not every new picture re-renders). */
function shownChanged(a: FinishVideo<Blob>, b: FinishVideo<Blob>): boolean {
  return (
    a.clips.length !== b.clips.length ||
    a.withoutPictures.length !== b.withoutPictures.length ||
    a.clips.some((clip, i) => clip.complete !== b.clips[i]?.complete)
  );
}

export function useFinishVideo(): FinishVideoControl {
  const current = useRef<FinishVideo<Blob>>(emptyVideo());
  const [video, setVideo] = useState<FinishVideo<Blob>>(current.current);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const update = useCallback((next: FinishVideo<Blob>) => {
    const before = current.current;
    current.current = next;
    if (shownChanged(before, next)) setVideo(next);
  }, []);

  // the frame loop while the camera runs: an element of its own, so no page has to show it
  useEffect(() => {
    if (!stream) return;
    const element = document.createElement('video');
    element.muted = true;
    element.playsInline = true;
    element.srcObject = stream;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let stopped = false;
    let lastAt: number | undefined;
    let handle = 0;
    const byFrame = 'requestVideoFrameCallback' in element;

    const take = ({ at, exact }: { at: number; exact: boolean }) => {
      if (stopped || !context || element.videoWidth === 0 || !isFrameDue(lastAt, at)) return;
      lastAt = at;
      const scale = Math.min(1, PICTURE_WIDTH / element.videoWidth);
      canvas.width = Math.round(element.videoWidth * scale);
      canvas.height = Math.round(element.videoHeight * scale);
      context.drawImage(element, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob && !stopped) update(addFrame(current.current, { at, exact, image: blob }));
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };
    const next = () => {
      if (stopped) return;
      if (byFrame) {
        handle = element.requestVideoFrameCallback((now, meta) => {
          take(pictureTime(now, meta.captureTime));
          next();
        });
      } else {
        // no frame callback: the picture drawn now may be older by an unknown time – not exact
        handle = requestAnimationFrame((now) => {
          take({ at: now, exact: false });
          next();
        });
      }
    };
    element
      .play()
      .then(next)
      .catch((reason: unknown) => setError(cameraError(reason)));
    return () => {
      stopped = true;
      if (byFrame) element.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
      element.srcObject = null;
    };
  }, [stream, update]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    update(stopRecording(current.current));
  }, [update]);

  const start = useCallback(() => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Dieser Browser gibt hier keine Kamera frei (nur über https oder als Datei).');
      return;
    }
    setStarting(true);
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      })
      .then((camera) => {
        streamRef.current = camera;
        setStream(camera);
      })
      .catch((reason: unknown) => setError(cameraError(reason)))
      .finally(() => setStarting(false));
  }, []);

  // leaving the app: the camera goes off
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const mark = useCallback(
    (finishIndex: number, pressAt: number, pressElapsed: number) => {
      if (streamRef.current)
        update(markFinish(current.current, finishIndex, pressAt, pressElapsed));
    },
    [update],
  );

  const clear = useCallback(() => {
    current.current = { ...emptyVideo<Blob>(), recent: current.current.recent };
    setVideo(current.current);
  }, []);

  return { on: stream !== null, starting, error, stream, video, start, stop, mark, clear };
}
