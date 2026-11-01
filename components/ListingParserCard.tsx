import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ClipboardPaste, Sparkles } from 'lucide-react-native';
import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { useDetailStyles } from './detailStyles';
import { parseListing } from '../utils/listingParser';
import type { ParsedListing } from '../utils/listingParser';

export default function ListingParserCard({
  onParsed,
}: {
  onParsed: (listing: ParsedListing, title: string) => void;
}) {
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);
  const [text, setText] = useState('');
  const [result, setResult] = useState<ParsedListing | null>(null);
  const disabled = !text.trim();
  function parse() {
    if (disabled) return;
    const parsed = parseListing(text);
    setResult(parsed);
    if (parsed.product)
      onParsed(parsed, text.trim().split(/\r?\n/)[0]?.slice(0, 300) ?? '');
  }
  return (
    <View style={shared.card} testID="listing-parser-card">
      <View style={styles.heading}>
        <ClipboardPaste size={22} color={colors.cyan} />
        <Text style={[shared.heading, styles.headingText]}>
          İlanı Yapıştır, Hemen Analiz Et
        </Text>
      </View>
      <Text style={shared.body}>
        İlan metninden cihazı, fiyatı ve belirtilen kusurları bulalım.
      </Text>
      <TextInput
        testID="listing-parser-input"
        accessibilityLabel="İlan başlığı veya açıklaması"
        placeholder="Sahibinden / Letgo İlan Başlığı veya Açıklamasını Yapıştırın..."
        placeholderTextColor={colors.muted}
        multiline
        maxLength={12000}
        textAlignVertical="top"
        value={text}
        onChangeText={(value) => {
          setText(value);
          setResult(null);
        }}
        style={styles.input}
      />
      <Pressable
        testID="parse-listing"
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={parse}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Sparkles size={18} color={colors.onAccent} />
        <Text style={styles.buttonText}>Ayrıştır &amp; Analiz Et</Text>
      </Pressable>
      {result && (
        <View
          testID="listing-parser-result"
          style={shared.item}
          accessibilityLiveRegion="polite"
        >
          <Text style={shared.title}>
            {result.product
              ? `Eşleşen cihaz: ${result.product.name}`
              : 'Ürün eşleştirilemedi'}
          </Text>
          {result.price !== null && (
            <Text style={shared.title}>
              İlan fiyatı:{' '}
              {result.price.toLocaleString('tr-TR', {
                maximumFractionDigits: 2,
              })}{' '}
              TL
            </Text>
          )}
          {result.findings.length > 0 && (
            <View style={styles.findings}>
              {result.findings.map((finding) => (
                <View
                  key={finding.kind}
                  style={[styles.finding, finding.warning && styles.warning]}
                >
                  <Text
                    style={[
                      shared.caption,
                      finding.warning && styles.warningText,
                    ]}
                  >
                    {finding.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {result.product && (
            <Text style={shared.body}>
              {result.price !== null
                ? 'Ürün, fiyat ve kondisyon değerleme alanına aktarıldı; fiyat analizi hazır.'
                : 'Ürün ve kondisyon seçildi. Değerleme alanına ilan fiyatını girin.'}
            </Text>
          )}
          {result.notes.map((note) => (
            <Text key={note} style={shared.caption}>
              {note}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    headingText: { flex: 1, minWidth: 0 },
    heading: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
    },
    input: {
      minHeight: 112,
      maxHeight: 220,
      minWidth: 0,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inset,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      lineHeight: 23,
      color: colors.text,
    },
    button: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      minHeight: 46,
      borderRadius: 12,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    buttonText: {
      color: colors.onAccent,
      fontSize: 14,
      fontWeight: '700',
      flexShrink: 1,
      textAlign: 'center',
    },
    pressed: { backgroundColor: colors.accentPressed },
    disabled: { opacity: 0.45 },
    findings: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    finding: {
      maxWidth: '100%',
      flexShrink: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.successBg,
    },
    warning: { backgroundColor: colors.dangerBg },
    warningText: { color: colors.dangerText },
  });
