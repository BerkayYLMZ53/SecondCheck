import Pressable from './AnimatedPressable';
import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import type { Product, Severity } from '../types/product';
import { calculateRiskScore } from '../utils/evaluator';
import { useDetailStyles } from './detailStyles';

export default function ChronicIssuesSection({
  product,
}: {
  product: Product;
}) {
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);
  const SEVERITIES: Record<Severity, { label: string; color: string }> = {
    low: { label: 'Düşük', color: colors.green },
    medium: { label: 'Orta', color: colors.amber },
    high: { label: 'Yüksek', color: colors.red },
  };
  const RISK_COLORS = {
    Düşük: colors.green,
    Orta: colors.amber,
    Yüksek: colors.red,
  };

  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const risk = calculateRiskScore(product.chronicIssues);
  const riskColor = RISK_COLORS[risk.level];

  function toggle(id: string) {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <View style={shared.card}>
      <Text accessibilityRole="header" style={shared.heading}>
        Kronik Sorun Risk Skoru
      </Text>
      <View style={shared.row}>
        <Text style={[styles.score, { color: riskColor }]}>
          {risk.score}
          <Text style={styles.scoreMax}> / 100</Text>
        </Text>
        <View style={[shared.pill, { backgroundColor: `${riskColor}20` }]}>
          <Text style={[shared.pillText, { color: riskColor }]}>
            {risk.level} Risk
          </Text>
        </View>
      </View>
      <Text style={shared.caption}>
        Soruna dokunarak tanı ve bakım ayrıntılarını açın. Risk puanı bilinen
        sorunların ağırlığıdır; bu cihazın arıza olasılığı değildir.
      </Text>
      {product.chronicIssues.length === 0 && (
        <Text style={shared.body}>
          Bu ürün için kayıtlı kronik sorun bulunmuyor.
        </Text>
      )}
      {product.chronicIssues.map((issue) => {
        const expanded = expandedIds.has(issue.id);
        const severity = SEVERITIES[issue.severity];
        return (
          <View key={issue.id} style={shared.item}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={issue.title}
              accessibilityState={{ expanded }}
              aria-expanded={expanded}
              onPress={() => toggle(issue.id)}
              style={({ pressed }) => [
                styles.trigger,
                pressed && shared.pressed,
              ]}
            >
              <View style={styles.issueHeading}>
                <View
                  style={[
                    shared.pill,
                    { backgroundColor: `${severity.color}20` },
                  ]}
                >
                  <Text style={[shared.pillText, { color: severity.color }]}>
                    {severity.label}
                  </Text>
                </View>
                <Text style={shared.title}>{issue.title}</Text>
              </View>
              {expanded ? (
                <ChevronUp size={20} color={colors.muted} />
              ) : (
                <ChevronDown size={20} color={colors.muted} />
              )}
            </Pressable>
            {expanded && (
              <View style={styles.details}>
                <Text style={shared.body}>{issue.description}</Text>
                <View style={styles.costTag}>
                  <Text style={styles.costText}>
                    Tahmini Onarım / Bakım: {issue.estimatedRepairCost}
                  </Text>
                </View>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    score: { fontSize: 36, fontWeight: '800' },
    scoreMax: { fontSize: 16, color: colors.muted, fontWeight: '500' },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 44,
      minWidth: 0,
    },
    issueHeading: { flex: 1, minWidth: 0, gap: 8, flexWrap: 'wrap' },
    details: {
      minWidth: 0,
      gap: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    costTag: {
      alignSelf: 'flex-start',
      maxWidth: '100%',
      borderRadius: 8,
      backgroundColor: colors.successBg,
      padding: 10,
    },
    costText: {
      color: colors.successText,
      fontSize: 12,
      lineHeight: 20,
      flexShrink: 1,
      flexWrap: 'wrap',
    },
  });
