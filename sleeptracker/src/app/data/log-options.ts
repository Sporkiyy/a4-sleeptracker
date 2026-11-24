/**
 * One-tap tags offered with a sleepiness check-in, e.g. to compare before and after
 * coffee. Tags are faster than typing on a phone and keep entries comparable day to day.
 */
export const SLEEPINESS_CONTEXTS: readonly string[] = [
  'Just woke up',
  'Before coffee',
  'After coffee',
  'At work',
  'After exercise',
  'After a meal',
];

/** Pairs of tags that contradict each other. Picking one deselects the other. */
const CONFLICTING_CONTEXTS: readonly (readonly [string, string])[] = [
  ['Before coffee', 'After coffee'],
  // "Just woke up" means the day hasn't started yet (it does go with "Before coffee").
  ['Just woke up', 'After coffee'],
  ['Just woke up', 'At work'],
  ['Just woke up', 'After exercise'],
  ['Just woke up', 'After a meal'],
];

/** Adds a tag to a check-in's tags, dropping any tag it contradicts. */
export function addContext(tags: readonly string[], tag: string): string[] {
  const contradicts = (other: string) => CONFLICTING_CONTEXTS.some((pair) => pair.includes(tag) && pair.includes(other));
  return [...tags.filter((t) => t !== tag && !contradicts(t)), tag];
}
