// Tally counter (Seilspringen, Durchgänge, Zielwurf): count, undo a mistaken tap, reset.

export type CounterAction = 'increment' | 'decrement' | 'reset';

export function counterReducer(count: number, action: CounterAction): number {
  switch (action) {
    case 'increment':
      return count + 1;
    case 'decrement':
      return Math.max(0, count - 1);
    case 'reset':
      return 0;
  }
}
