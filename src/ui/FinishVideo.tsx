// Zielvideo on the stopwatch: switch and live picture, and per finish the pictures around the press
// to step through and – where the camera tells when it took them – take the time of the one where
// the athlete crosses the line.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FINISH_WINDOW,
  canTakeTime,
  frameElapsed,
  pressFrameIndex,
  type FinishClip,
} from '../logic/finishVideo';
import type { FinishVideoControl } from './useFinishVideo';

const seconds = (ms: number) => String(ms / 1000).replace('.', ',');

export function CameraSwitch({ control }: { control: FinishVideoControl }) {
  const preview = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (preview.current) preview.current.srcObject = control.stream;
  }, [control.stream]);

  return (
    <div className="camera">
      <button
        type="button"
        className="chip"
        aria-pressed={control.on}
        disabled={control.starting}
        onClick={() => (control.on ? control.stop() : control.start())}
      >
        {control.starting ? 'Zielvideo startet …' : `Zielvideo ${control.on ? 'an' : 'aus'}`}
      </button>
      {control.on && (
        <video
          ref={preview}
          className="camera-preview"
          autoPlay
          muted
          playsInline
          aria-label="Bild der Kamera"
        />
      )}
      {control.error && (
        <p className="message error" role="alert">
          {control.error}
        </p>
      )}
      <p className="muted">
        Zielvideo: Kamera aufs Ziel richten. Je „Zieleinlauf“ bleiben die Bilder{' '}
        {seconds(FINISH_WINDOW.beforeMs)} s davor bis {seconds(FINISH_WINDOW.afterMs)} s danach –
        nur im Arbeitsspeicher dieses Geräts, nie gespeichert, weg beim Zurücksetzen oder Schließen.
        Nur filmen, wenn die Gefilmten (bei Kindern die Eltern) einverstanden sind.
      </p>
    </div>
  );
}

/** The pictures of one finish; opens at the picture of the press. */
export function FinishPictures({
  clip,
  describe,
  onTake,
}: {
  clip: FinishClip<Blob>;
  /** How a stopwatch time reads (the readings for the card). */
  describe: (milliseconds: number) => ReactNode;
  onTake: (milliseconds: number) => void;
}) {
  const press = pressFrameIndex(clip);
  const [chosen, setChosen] = useState(press);
  const last = clip.frames.length - 1;
  const index = Math.min(Math.max(chosen, 0), last);
  const frame = clip.frames[index];
  const url = useMemo(() => (frame ? URL.createObjectURL(frame.image) : undefined), [frame]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);

  if (!frame) {
    return <p className="muted">Keine Bilder – die Kamera lief beim Zieleinlauf noch nicht.</p>;
  }
  const time = frameElapsed(clip, frame);
  const atPress = index === press;
  // without the camera's capture time a picture's time would be late by the camera's delay
  const exact = canTakeTime(frame);
  return (
    <div className="finish-pictures">
      <img
        src={url}
        alt={`Zielbild ${index + 1} von ${last + 1}`}
        className={atPress ? 'press' : ''}
      />
      <p>
        {atPress && (
          <strong className="press-mark">
            ● {exact ? '' : 'etwa beim '}Druck auf „Zieleinlauf“ ·{' '}
          </strong>
        )}
        Bild {index + 1} von {last + 1}
        {exact && <> · {describe(time)}</>}
      </p>
      <div className="actions">
        <button
          type="button"
          aria-label="Bild zurück"
          disabled={index <= 0}
          onClick={() => setChosen(index - 1)}
        >
          ◀
        </button>
        <input
          type="range"
          min={0}
          max={last}
          value={index}
          aria-label="Bild wählen"
          onChange={(event) => setChosen(Number(event.target.value))}
        />
        <button
          type="button"
          aria-label="Bild vor"
          disabled={index >= last}
          onClick={() => setChosen(index + 1)}
        >
          ▶
        </button>
        <button type="button" disabled={atPress} onClick={() => setChosen(press)}>
          zum Druck
        </button>
      </div>
      {exact ? (
        <>
          <button type="button" onClick={() => onTake(time)}>
            Zeit dieses Bildes übernehmen
          </button>
          <p className="muted">
            Das erste Bild nehmen, auf dem die Ziellinie erreicht ist – dann ist die Zeit nie zu
            kurz.
          </p>
        </>
      ) : (
        <p className="muted">
          Dieses Gerät meldet nicht, wann die Kamera das Bild aufgenommen hat. Die Bilder zeigen den
          Zieleinlauf; eine Zeit daraus wäre um die Verzögerung der Kamera falsch – es gilt die
          gedrückte Zeit.
        </p>
      )}
      {!clip.complete && <p className="muted">Die Bilder nach dem Druck kommen noch …</p>}
    </div>
  );
}
