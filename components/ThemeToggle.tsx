import { Pressable, StyleSheet } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, colors, toggleTheme } = useTheme();
  const Icon = theme === 'dark' ? Sun : Moon;
  return (
    <Pressable
      testID="theme-toggle"
      accessibilityRole="button"
      accessibilityLabel={
        theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'
      }
      accessibilityHint={`Etkin tema: ${theme === 'dark' ? 'Koyu' : 'Açık'}`}
      aria-pressed={theme === 'light'}
      onPress={toggleTheme}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        pressed && styles.pressed,
      ]}
    >
      <Icon size={21} color={colors.accent} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
