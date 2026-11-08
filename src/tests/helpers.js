/**
 * Scripted RNG: returns the given values in order, then `fallback` forever.
 * 0.99 means "miss nothing / resist everything / max roll"; 0 means "always trigger / min roll".
 */
export function scriptedRng(values = [], fallback = 0.5) {
  const queue = [...values];
  return () => (queue.length ? queue.shift() : fallback);
}

/** RNG that always returns the same value. */
export const constantRng = (value) => () => value;
