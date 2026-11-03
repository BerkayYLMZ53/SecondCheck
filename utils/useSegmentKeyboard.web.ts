import { useEffect } from 'react';

export function useSegmentKeyboard(id: string, values: readonly string[], onChange: (value: string) => void, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const root = [...document.querySelectorAll<HTMLElement>('[data-testid]')].find((element) => element.getAttribute('data-testid') === id);
    if (!root) return;
    const key = (event: KeyboardEvent) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const controls = [...root.querySelectorAll<HTMLElement>('[role="tab"]')];
      const index = controls.findIndex((element) => element === document.activeElement);
      if (index < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? values.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + values.length) % values.length;
      const value = values[next]; if (value === undefined) return;
      onChange(value); controls[next]?.focus({ preventScroll: true });
    };
    root.addEventListener('keydown', key);
    return () => root.removeEventListener('keydown', key);
  }, [id, values, onChange, active]);
}
