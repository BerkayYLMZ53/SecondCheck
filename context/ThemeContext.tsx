import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type Theme = 'dark' | 'light';
const BASE_PALETTES = {
  dark: {
    bg: '#0B0F19',
    cardBg: '#131B2E',
    cardBorder: '#1E2942',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    accent: '#3B82F6',
  },
  light: {
    bg: '#F1F5F9',
    cardBg: '#FFFFFF',
    cardBorder: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    accent: '#2563EB',
  },
} as const;

function palette(theme: Theme) {
  const base = BASE_PALETTES[theme];
  const dark = theme === 'dark';
  return {
    ...base,
    // Aliases keep the same semantic roles throughout screens and shared cards.
    background: base.bg,
    surface: base.cardBg,
    border: base.cardBorder,
    text: base.textPrimary,
    muted: base.textSecondary,
    blue: base.accent,
    cyan: dark ? '#38BDF8' : '#0369A1',
    green: dark ? '#10B981' : '#047857',
    amber: dark ? '#FBBF24' : '#92400E',
    red: dark ? '#EF4444' : '#B91C1C',
    successText: dark ? '#6EE7B7' : '#047857',
    dangerText: dark ? '#FCA5A5' : '#B91C1C',
    successBg: dark ? '#142B29' : '#ECFDF5',
    dangerBg: dark ? '#EF444420' : '#FEF2F2',
    inset: dark ? '#0B0F19' : '#F8FAFC',
    accentSoft: dark ? '#152F55' : '#DBEAFE',
    accentSelected: dark ? '#112239' : '#EFF6FF',
    accentHover: dark ? '#214573' : '#BFDBFE',
    accentPressed: '#1D4ED8',
    badgeBg: dark ? '#1B2B43' : '#E2E8F0',
    chipBg: dark ? '#22304A' : '#E2E8F0',
    track: dark ? '#27344D' : '#CBD5E1',
    checkedBg: dark ? '#102522' : '#ECFDF5',
    checkedBorder: dark ? '#1A6455' : '#6EE7B7',
    pointStroke: dark ? '#E2E8F0' : '#FFFFFF',
    overlay: dark ? '#000000B3' : '#0F172A66',
    onAccent: '#FFFFFF',
  };
}
export type ThemeColors = ReturnType<typeof palette>;
export const THEME_PALETTES = {
  dark: palette('dark'),
  light: palette('light'),
};
interface ThemeContextValue {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const toggleTheme = useCallback(
    () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    [],
  );
  const value = useMemo(
    () => ({ theme, colors: THEME_PALETTES[theme], toggleTheme }),
    [theme, toggleTheme],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider.');
  return context;
}

/** Rebuild component styles only when its palette changes. */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
