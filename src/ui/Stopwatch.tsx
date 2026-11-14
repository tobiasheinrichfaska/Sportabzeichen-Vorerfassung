import { useEffect, useState } from 'react';
import {
  STOPWATCH_RESET,
  elapsed,
  finishStopwatch,
  formatStopwatch,
  isRunning,
  readingParts,
  setFinish,
  startStopwatch,
  stopStopwatch,
  type StopwatchState,
  type TimedMeasure,
} from '../logic/stopwatch';
import { MAX_CLIPS, clipFor } from '../logic/finishVideo';
import { fastPress } from './fastPress';
import { CameraSwitch, FinishPictures } from './FinishVideo';
import type { FinishVideoControl } from './useFinishVideo';

const READINGS: readonly { kind: TimedMeasure; label: string }[] = [
  { kind: 'secTenth', label: 'Schnelligkeit' },
  { kind: 'minSec', label: 'Ausdauer' },
];

/** Value for the card in normal weight, the next digit lighter: "Schnelligkeit: 8,4" + "3". */
function Readings({
  milliseconds,
  only,
}: {
  milliseconds: number;
  only?: TimedMeasure | undefined;
}) {
  return (
    <span className="readings">
      {READINGS.filter(({ kind }) => !only || kind === only).map(({ kind, label }) => {
        const { card, finer } = readingParts(kind, milliseconds);
        return (
          <span key={kind}>
            {label}: <strong>{card}</strong>
            <span className="finer" title="nächste Stelle, nicht für die Prüfkarte">
              {finer}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * The state lives in the app, so a running stopwatch survives a change of page. `compact`: at the
 * exercise on „Erfassen“ (Tobias 2026-11-11), only the reading of that exercise (`kind`).
 */
export function Stopwatch({
  state,
  setState,
  compact = false,
  kind,
  video,
}: {
  state: StopwatchState;
  setState: (update: (current: StopwatchState) => StopwatchState) => void;
  compact?: boolean;
  kind?: TimedMeasure;
  /** The Zielvideo (camera in the app); without it the stopwatch has none. */
  video?: FinishVideoControl;
}) {
  const [now, setNow] = useState(() => performance.now());
  // the finish whose Zielbilder are open
  const [showing, setShowing] = useState<number | null>(null);
  const running = isRunning(state);

  useEffect(() => {
    if (!running) return;
    let frame = requestAnimationFrame(function tick() {
      setNow(performance.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running]);

  const apply = (step: (state: StopwatchState, at: number) => StopwatchState) => (at: number) => {
    setState((current) => step(current, at));
    setNow(at);
  };
  const shown = elapsed(state, now);
  const Wrapper = compact ? 'div' : 'section';

  return (
    <Wrapper className={compact ? 'stopwatch compact' : 'stopwatch'}>
      {!compact && <h2>Stoppuhr</h2>}
      <p className="stopwatch-display" aria-live="off">
        {formatStopwatch(shown)}
      </p>
      <div className="actions">
        <button
          type="button"
          className="big-button"
          {...fastPress(apply(running ? stopStopwatch : startStopwatch))}
        >
          {running ? 'Stopp' : shown > 0 ? 'Weiter' : 'Start'}
        </button>
        <button
          type="button"
          className="big-button"
          disabled={!running}
          {...fastPress((at) => {
            // the Zielvideo keeps the pictures around this press (index = the new finish)
            if (running) video?.mark(state.finishes.length, at, elapsed(state, at));
            setState((current) => finishStopwatch(current, at));
            setNow(at);
          })}
        >
          Zieleinlauf
        </button>
        <button
          type="button"
          disabled={running}
          {...fastPress(() => {
            setState(() => STOPWATCH_RESET);
            setShowing(null);
            video?.clear();
          })}
        >
          Zurücksetzen
        </button>
      </div>
      {!running && shown > 0 && (
        <p>
          Gestoppt: <Readings milliseconds={shown} only={kind} />
        </p>
      )}
      {state.finishes.length > 0 && (
        <ol className="finishes">
          {state.finishes.map((finish, index) => {
            const clip = video ? clipFor(video.video, index) : undefined;
            return (
              <li key={index}>
                {formatStopwatch(finish)} – <Readings milliseconds={finish} only={kind} />
                {clip && Math.round(clip.pressElapsed) !== Math.round(finish) && (
                  <span className="muted">
                    {' '}
                    (aus dem Zielbild; Druck {formatStopwatch(clip.pressElapsed)})
                  </span>
                )}
                {clip && (
                  <button
                    type="button"
                    className="link-button"
                    aria-expanded={showing === index}
                    onClick={() => setShowing(showing === index ? null : index)}
                  >
                    {showing === index ? 'Zielbilder schließen' : 'Zielbilder'}
                  </button>
                )}
                {video?.video.withoutPictures.includes(index) && (
                  <span className="muted">
                    {' '}
                    – ohne Zielbilder (mehr als {MAX_CLIPS} Zieleinläufe)
                  </span>
                )}
                {clip && showing === index && (
                  <FinishPictures
                    clip={clip}
                    describe={(ms) => (
                      <>
                        {formatStopwatch(ms)} – <Readings milliseconds={ms} only={kind} />
                      </>
                    )}
                    onTake={(ms) => setState((current) => setFinish(current, index, ms))}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}
      {video && <CameraSwitch control={video} />}
      {compact ? (
        <p className="muted">
          Beim Kind die Zeit „⏱ …“ antippen übernimmt sie. Gemeinsamer Start: „Zieleinlauf“ je
          Person.
        </p>
      ) : (
        <p className="muted">
          „Zieleinlauf“ nimmt bei gemeinsamem Start eine Zeit je Person. Fett steht der Wert für die
          Prüfkarte, abgelesen wie im Prüfungswegweiser verlangt (Schnelligkeit auf Zehntel,
          Ausdauer auf volle Sekunden, weitere Stellen abgeschnitten). Die hellere Ziffer dahinter
          ist die nächste Stelle – sie wird nicht eingetragen, hilft aber bei Grenzfällen.
        </p>
      )}
    </Wrapper>
  );
}
