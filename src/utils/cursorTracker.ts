// Tracks the last known mouse position in canvas (world-space, unscaled)
// coordinates, so paste can drop content where the cursor currently is.
// Deliberately a plain mutable object rather than store/React state --
// updating on every mousemove would otherwise re-render every component
// subscribed to the simulation store.
export const lastCanvasMouse: { x: number | null; y: number | null } = {
  x: null,
  y: null,
};
