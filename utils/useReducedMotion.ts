import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let reduced = false;
let subscription: { remove: () => void } | undefined;
let generation = 0;
const listeners = new Set<() => void>();
function update(value: boolean) {
  if (value === reduced) return;
  reduced = value;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const current = ++generation;
    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => { generation++; update(value); });
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (current === generation) update(value); }).catch(() => {});
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { generation++; subscription?.remove(); subscription = undefined; }
  };
}
// One OS subscription for all buttons/cards; no listener per catalog row.
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reduced, () => false);
}
