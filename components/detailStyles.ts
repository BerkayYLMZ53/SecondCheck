import { StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';

const createDetailStyles = (detailColors: ThemeColors) =>
  StyleSheet.create({
    card: {
      minWidth: 0,
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      backgroundColor: detailColors.cardBg,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: detailColors.border,
      gap: 16,
    },
    heading: {
      minWidth: 0,
      maxWidth: '100%',
      color: detailColors.text,
      fontSize: 18,
      lineHeight: 25,
      fontWeight: '700',
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
    },
    title: {
      minWidth: 0,
      maxWidth: '100%',
      color: detailColors.text,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: '600',
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    body: {
      minWidth: 0,
      maxWidth: '100%',
      color: detailColors.muted,
      fontSize: 13,
      lineHeight: 21,
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    caption: {
      minWidth: 0,
      maxWidth: '100%',
      color: detailColors.muted,
      fontSize: 12,
      lineHeight: 19,
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    item: {
      minWidth: 0,
      width: '100%',
      maxWidth: '100%',
      backgroundColor: detailColors.inset,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: detailColors.border,
      padding: 12,
      gap: 12,
    },
    pill: {
      alignSelf: 'flex-start',
      maxWidth: '100%',
      flexShrink: 1,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: detailColors.accentSoft,
    },
    pillText: {
      color: detailColors.cyan,
      fontSize: 12,
      lineHeight: 19,
      fontWeight: '600',
      flexShrink: 1,
      flexWrap: 'wrap',
    },
    button: {
      minWidth: 44,
      minHeight: 44,
      flexShrink: 1,
      maxWidth: '100%',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: detailColors.accentSoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      color: detailColors.text,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: '600',
      flexShrink: 1,
      flexWrap: 'wrap',
      textAlign: 'center',
    },
    pressed: { opacity: 0.7 },
  });

export function useDetailStyles() {
  const { colors } = useTheme();
  const shared = useThemedStyles(createDetailStyles);
  return { colors, shared };
}
