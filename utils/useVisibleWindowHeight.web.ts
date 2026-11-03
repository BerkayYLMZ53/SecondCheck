import { useEffect, useState } from 'react';

export function useVisibleWindowHeight(): number {
  const [height, setHeight] = useState(() => window.visualViewport?.height ?? window.innerHeight);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => { if (!viewport || viewport.scale === 1) setHeight(viewport?.height ?? window.innerHeight); };
    window.addEventListener('resize', resize); viewport?.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); viewport?.removeEventListener('resize', resize); };
  }, []);
  return height;
}
