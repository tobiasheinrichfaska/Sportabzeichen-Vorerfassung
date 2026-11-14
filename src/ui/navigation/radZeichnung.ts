// Drawing units of the wheel, shared by the big wheel and the small one on detail pages: the wheel
// lives in a square of 2 × HALB around its centre. Paths come from `keilPfad` (logic).

export const AUSSEN = 96;
export const INNEN = 36;
export const HALB = 110;

export const punkt = (winkel: number, radius: number) => ({
  x: radius * Math.sin(winkel),
  y: -radius * Math.cos(winkel),
});
