import { useEffect } from 'react';

export function useSheetAccessibility(open: boolean, testID: string, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const root = [...document.querySelectorAll<HTMLElement>('[data-testid]')].find((element) => element.getAttribute('data-testid') === `${testID}-panel`);
    if (!root) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () => [...root.querySelectorAll<HTMLElement>('button, [role="button"], input, textarea, select, a[href], [tabindex="0"]')]
      .filter((node) => node.getAttribute('aria-disabled') !== 'true' && !node.hasAttribute('disabled') && node.getClientRects().length > 0);
    const timer = setTimeout(() => focusables()[0]?.focus({ preventScroll: true }), 0);
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const active = document.activeElement;
      // Native-like child modals own their keyboard interaction while open.
      if (active && active !== document.body && !root.contains(active)) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = focusables(); const first = controls[0]; const last = controls.at(-1);
      if (!first || !last) { event.preventDefault(); return; }
      if (event.shiftKey && (active === first || !root.contains(active))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (active === last || !root.contains(active))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { clearTimeout(timer); document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [open, testID, onClose]);
}
