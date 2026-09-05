/**
 * Guaranteed deep clone utility for steps and canvas visual objects.
 * Prevents any shared mutable references between consecutive steps.
 */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // Fallback if structuredClone fails on any specific symbol or object
      return JSON.parse(JSON.stringify(value));
    }
  }
  return JSON.parse(JSON.stringify(value));
}
