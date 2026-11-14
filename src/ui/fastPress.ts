import type { MouseEvent, PointerEvent } from 'react';
import { pressTime } from '../logic/stopwatch';

/**
 * Handlers that act on pointer DOWN — no wait for release, no tap delay — while keyboard
 * activation still works: a keyboard "click" has detail 0, a pointer click is ignored because
 * pointerdown already acted. No preventDefault, so the button still takes focus for the keyboard;
 * zoom and text selection are stopped by CSS (touch-action, user-select). The action gets the
 * moment of the press (the event's time), so a busy page cannot make a measured time late.
 */
export function fastPress(action: (at: number) => void) {
  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      action(pressTime(event.timeStamp, performance.now()));
    },
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail === 0) action(pressTime(event.timeStamp, performance.now()));
    },
  };
}
