import '../styles/web.css';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function WebPageStyles() {
  const { theme, colors } = useTheme();
  useEffect(() => {
    // Fit the visible browser area when mobile keyboards or browser bars resize it.
    const viewport = window.visualViewport;
    const updateHeight = () => {
      if (viewport && viewport.scale !== 1) return;
      document.documentElement.style.setProperty(
        '--app-height',
        `${viewport?.height ?? window.innerHeight}px`,
      );
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    viewport?.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      viewport?.removeEventListener('resize', updateHeight);
    };
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.setProperty('--page-bg', colors.bg);
    root.style.setProperty('--color-scheme', theme);
    root.style.setProperty('--action-hover', colors.accentHover);
    root.style.setProperty('--action-pressed', colors.accentSoft);
    root.style.setProperty('--focus-color', colors.accent);
  }, [theme, colors]);
  return null;
}
