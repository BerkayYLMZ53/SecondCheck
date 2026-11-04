import Pressable from '../components/AnimatedPressable';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, ClipboardCheck, Stethoscope } from 'lucide-react-native';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import type { Product } from '../types/product';
import ThemeToggle from '../components/ThemeToggle';
import ProductPickerModal from '../components/ProductPickerModal';
import InspectionChecklist from '../components/InspectionChecklist';
import HardwareDiagnosticsModal from '../components/HardwareDiagnosticsModal';
import DeviceTeardownView from '../components/DeviceTeardownView';
import { parseDeviceListing } from '../utils/deviceListingParser';

/** Reuse the existing picker, inspection and hardware tests in the fourth tab. */
export default function DiagnosticsScreen({ active = true }: { active?: boolean }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const device = useMemo(() => product?.category === 'phone' ? parseDeviceListing(product.name).matchedDevice : null, [product]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <ScrollView testID="diagnostics-screen" keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}>
        <View style={styles.headingRow}>
          <View style={styles.grow}>
            <Text style={styles.eyebrow}>YERİNDE İNCELEME</Text>
            <Text accessibilityRole="header" style={styles.heading}>Teşhis &amp; Checklist</Text>
          </View>
          <ThemeToggle />
        </View>
        <Text style={styles.body}>Cihazı seçin, satın alma kontrollerini adım adım tamamlayın. Ekran, dokunmatik ve ses testlerini aynı yerden açın.</Text>
        <Pressable testID="diagnostics-select-device" accessibilityRole="button" accessibilityLabel="Kontrol listesi için cihaz seç"
          onPress={() => setPickerOpen(true)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.row}><ClipboardCheck size={21} color={colors.cyan} /><Text style={styles.label}>Kontrol edilecek cihaz</Text><ChevronDown size={18} color={colors.cyan} /></View>
          <Text style={styles.productName}>{product?.name ?? 'Marka veya model seçin'}</Text>
        </Pressable>
        <Pressable testID="diagnostics-open-tests" accessibilityRole="button" onPress={() => setDiagnosticsOpen(true)}
          style={({ pressed }) => [styles.testButton, pressed && styles.pressed]}>
          <Stethoscope size={22} color={colors.onAccent} /><Text style={styles.buttonText}>Donanımı Yerinde Test Et</Text>
        </Pressable>
        {device && <View style={styles.card}><DeviceTeardownView device={device} active={active && !diagnosticsOpen && !pickerOpen} /></View>}
        {product ? <InspectionChecklist key={product.id} product={product} /> : (
          <View style={styles.card}><Text style={styles.productName}>Kontrol listeniz burada görünecek</Text>
            <Text style={styles.body}>Modele özel kontroller için yukarıdan bir cihaz seçin. İlanınıza özel telefon ekspertizini Ana Sayfa’daki ilan analiziyle hazırlayabilirsiniz.</Text></View>
        )}
      </ScrollView>
      {pickerOpen && <ProductPickerModal slotLabel="Kontrol listesi cihazı" searchLabel="Kontrol listesi cihazı ara" selectedProduct={product}
        onSelect={(selected) => { setProduct(selected); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
      {diagnosticsOpen && <HardwareDiagnosticsModal onClose={() => setDiagnosticsOpen(false)} />}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 100, width: '100%', maxWidth: 680, alignSelf: 'center', gap: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  grow: { flex: 1, minWidth: 0 },
  heading: { fontSize: 28, lineHeight: 36, color: colors.textPrimary, fontWeight: '800' },
  eyebrow: { fontSize: 10, lineHeight: 18, color: colors.cyan, fontWeight: '800', letterSpacing: 1.8 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 23 },
  card: { gap: 12, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.cardBg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1, minWidth: 0, color: colors.cyan, fontSize: 12, lineHeight: 19, fontWeight: '700' },
  productName: { color: colors.textPrimary, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  testButton: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, minHeight: 52, borderRadius: 15, backgroundColor: colors.accent },
  buttonText: { color: colors.onAccent, fontSize: 14, lineHeight: 22, fontWeight: '700', flexShrink: 1 },
  pressed: { opacity: 0.75 },
});
