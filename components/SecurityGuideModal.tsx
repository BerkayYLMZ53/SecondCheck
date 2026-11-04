import Pressable from './AnimatedPressable';
import { useState } from 'react';
import { Linking, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  CheckSquare,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  Square,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../context/ThemeContext';
import type { ThemeColors } from '../context/ThemeContext';
import { useDetailStyles } from './detailStyles';

interface SecurityCheckpoint {
  id: string;
  title: string;
  instruction: string;
}
interface SecurityPhase {
  id: string;
  title: string;
  badge: string;
  tone: 'danger' | 'warning';
  checkpoints: readonly SecurityCheckpoint[];
}

// Reviewed 2026-11-01. These are personal reminders, never transaction approval.
// Timing differs by platform/seller: refer to the order's actual deadline.
const PHASES: readonly SecurityPhase[] = [
  {
    id: 'payment',
    title: 'A. Alım Öncesi: Sahte Link ve Ödeme Güvenliği',
    badge: 'KRİTİK • ÖDEME',
    tone: 'danger',
    checkpoints: [
      {
        id: 'domain',
        title: 'Alan Adı Doğrulama',
        instruction:
          'WhatsApp veya SMS üzerinden “sahibinden-paramguvende-odeme.com” gibi bir ödeme linki gönderilirse KESİNLİKLE tıklamayın. Resmî mobil uygulamayı kendiniz açın, ilan numarasıyla ürünü bulun ve işlemi uygulama içinden yürütün. Benzer logo, isim veya kilit simgesi tek başına güvenilirlik kanıtı değildir.',
      },
      {
        id: 'payment',
        title: 'Açıklama / IBAN Tuzağı',
        instruction:
          'Satıcı “Açıklamaya ilan no yazıp doğrudan IBAN’ıma havale yapın” diyorsa işlemi durdurun. S - Param Güvende’de Havale/EFT ödeme seçeneği bulunmaz; resmî uygulamadaki ödeme akışını kullanın. Platform dışı transferlerde para iadesi garanti değildir. Para gönderdiyseniz gecikmeden bankanıza ve platforma bildirin.',
      },
    ],
  },
  {
    id: 'delivery',
    title: 'B. Kargo Teslimatı ve Paket Açılışı',
    badge: 'KRİTİK • KAYITLARI SAKLA',
    tone: 'warning',
    checkpoints: [
      {
        id: 'video',
        title: 'Kesintisiz Video Kaydı',
        instruction:
          'Kargo poşetini açmadan önce takip barkodu, etiket ve paketin dış yüzeyi net görünecek şekilde telefonla video kaydı başlatın. Paketi kesme anından içeriği ve ürünün seri numarasını göstermeye kadar kaydı durdurmayın. Orijinal kaydı ve ambalajı saklayın.',
      },
      {
        id: 'package',
        title: 'Kutu İçi Ağırlık / Fiziksel Kontrol',
        instruction:
          'Paketin ağırlığı, ambalajı ve içeriğini kontrol edin. Kutudan ürün yerine salatalık, un veya kırık cam gibi farklı bir içerik çıkarsa güvenli biçimde fotoğraf/video ile belgeleyin. Hasarlı teslimatta kargo görevlisinden Hasar Tespit Tutanağı isteyin; yanlış içerik varsa durumu da kayda geçirtin. Barkod, ambalaj, tutanak, ilan, yazışma ve ödeme kayıtlarını saklayıp platforma bildirin.',
      },
    ],
  },
  {
    id: 'approval',
    title: 'C. Onay Öncesi: Süre ve Test Kontrolü',
    badge: 'ONAYDAN ÖNCE TEST ET',
    tone: 'warning',
    checkpoints: [
      {
        id: 'serial',
        title: 'Seri Numarası Eşleştirmesi',
        instruction:
          'Fatura ve kutudaki seri numarasını, cihazın erişilebilir seri numarası etiketiyle ve varsa ayarlar/üretici yazılımındaki bilgiyle birebir karşılaştırın. GPU’da arka etiketi kontrol edin; sırf bu kontrol için cihazı sökmeyin. Model veya seri numarası uyuşmazlığını onay vermeden önce satıcıya ve platforma bildirin.',
      },
      {
        id: 'tests',
        title: 'Stres Testi Bitmeden Onay Vermeyin',
        instruction:
          'S - Param Güvende’de bireysel satıcıdan alımlarda teslimattan sonra 2 günlük iade talebi süresi bulunur; işlem yapılmazsa otomatik onay gerçekleşebilir. Mağaza ve diğer platformların koşulları farklıdır: sipariş ekranındaki güncel son tarihi kontrol edin. FurMark, Cinebench veya pil testlerini tamamlamadan “Hemen onayla param yatsın” baskısıyla onay vermeyin. Sorun varsa süre dolmadan uygulamada iade/destek sürecini başlatın.',
      },
    ],
  },
];
const TOTAL = PHASES.reduce((sum, phase) => sum + phase.checkpoints.length, 0);
const OFFICIAL_SOURCES = [
  {
    title: 'Resmî ödeme ve sahte link uyarıları',
    url: 'https://yardim.sahibinden.com/hc/tr/articles/8402707984924-S-Param-G%C3%BCvende-ile-G%C3%BCvenli-Al%C4%B1%C5%9Fveri%C5%9F-%C4%B0pu%C3%A7lar%C4%B1',
  },
  {
    title: 'Resmî teslimat ve iade süreleri',
    url: 'https://yardim.sahibinden.com/hc/tr/articles/360020588459-Kargo-Bedeli-Nedir-Kargo-S%C3%BCreci-Nas%C4%B1l-%C4%B0%C5%9Fliyor',
  },
] as const;

export default function SecurityGuideModal({
  visible = true,
  onClose,
}: {
  visible?: boolean;
  onClose: () => void;
}) {
  const { colors, shared } = useDetailStyles();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [linkError, setLinkError] = useState<string | null>(null);
  const completed = checkedIds.size;
  const progress = Math.round((completed / TOTAL) * 100);
  function toggle(id: string) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  async function openSource(url: string) {
    setLinkError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError(
        'Yardım sayfası açılamadı. Resmî uygulamanın yardım bölümünden güncel kurallara ulaşabilirsiniz.',
      );
    }
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType={Platform.OS === 'web' ? 'none' : 'fade'}
      accessibilityLabel="Param Güvende ve Kargo Güvenlik Rehberi"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
            paddingLeft: Math.max(insets.left, 12),
            paddingRight: Math.max(insets.right, 12),
          },
        ]}
      >
        <View
          style={styles.sheet}
          accessibilityViewIsModal
          testID="security-guide-modal"
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <ShieldCheck size={24} color="#F59E0B" />
              <View style={styles.headerText}>
                <Text accessibilityRole="header" style={shared.heading}>
                  Param Güvende &amp; Kargo Güvenlik Rehberi
                </Text>
                <Text style={styles.subtitle}>Dolandırıcılık Kalkanı</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Güvenlik rehberini kapat"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && shared.pressed]}
            >
              <X size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView
            testID="security-guide-scroll"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <Text style={shared.body}>
              Ödeme, teslimat ve ürün onayında bu altı kontrolü tek tek
              tamamlayın. Şüphede işlemi durdurup resmî uygulamadaki destek
              kanalını kullanın.
            </Text>
            {PHASES.map((phase) => {
              const phaseCompleted = phase.checkpoints.filter((item) =>
                checkedIds.has(item.id),
              ).length;
              const accent = phase.tone === 'danger' ? '#EF4444' : '#F59E0B';
              return (
                <View
                  key={phase.id}
                  style={styles.phase}
                  testID={`security-phase-${phase.id}`}
                >
                  <View style={shared.row}>
                    <View
                      style={[
                        styles.badge,
                        { borderColor: accent, backgroundColor: `${accent}18` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color:
                              phase.tone === 'danger'
                                ? colors.dangerText
                                : colors.amber,
                          },
                        ]}
                      >
                        {phase.badge}
                      </Text>
                    </View>
                    <Text style={shared.caption}>
                      {phaseCompleted} / {phase.checkpoints.length} kontrol
                    </Text>
                  </View>
                  <Text accessibilityRole="header" style={shared.heading}>
                    {phase.title}
                  </Text>
                  {phase.checkpoints.map((item) => {
                    const checked = checkedIds.has(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        testID={`security-check-${item.id}`}
                        accessibilityRole="checkbox"
                        accessibilityLabel={item.title}
                        accessibilityHint={item.instruction}
                        accessibilityState={{ checked }}
                        aria-checked={checked}
                        onKeyDown={
                          Platform.OS === 'web'
                            ? (event) => {
                                // RN Web handles Enter; checkbox-role views need Space explicitly.
                                if (event.nativeEvent.key === ' ') {
                                  event.preventDefault();
                                  if (!event.nativeEvent.repeat)
                                    toggle(item.id);
                                }
                              }
                            : undefined
                        }
                        onPress={() => toggle(item.id)}
                        style={({ pressed }) => [
                          styles.checkpoint,
                          checked && styles.checked,
                          pressed && shared.pressed,
                        ]}
                      >
                        {checked ? (
                          <CheckSquare size={23} color={colors.accent} />
                        ) : (
                          <Square size={23} color={colors.muted} />
                        )}
                        <View style={styles.checkpointText}>
                          <Text style={shared.title}>{item.title}</Text>
                          <Text style={shared.body}>{item.instruction}</Text>
                          <Text
                            style={[
                              shared.caption,
                              checked && styles.checkedLabel,
                            ]}
                          >
                            {checked
                              ? 'Anladım, Kontrol Ettim'
                              : 'Okuyup kontrol ettiğinizde işaretleyin'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
            <View style={shared.item}>
              <Text style={shared.title}>
                Güncel kuralları resmî kaynaktan kontrol edin
              </Text>
              <Text style={shared.caption}>
                Süreler platforma, satıcıya ve sipariş koşullarına göre
                değişebilir. Kontrol tarihi: 01.11.2026.
              </Text>
              {OFFICIAL_SOURCES.map((source) => (
                <Pressable
                  key={source.url}
                  accessibilityRole="link"
                  accessibilityLabel={source.title}
                  onPress={() => void openSource(source.url)}
                  style={({ pressed }) => [
                    styles.source,
                    pressed && shared.pressed,
                  ]}
                >
                  <ExternalLink size={16} color={colors.cyan} />
                  <Text style={styles.sourceText}>{source.title}</Text>
                </Pressable>
              ))}
              {linkError && (
                <Text accessibilityRole="alert" style={styles.linkError}>
                  {linkError}
                </Text>
              )}
            </View>
          </ScrollView>
          <View style={styles.footer}>
            <View style={shared.row}>
              <Text style={shared.title}>Anladım, Kontrol Ettim</Text>
              <Text
                testID="security-guide-progress"
                accessibilityLiveRegion="polite"
                style={shared.caption}
              >
                {completed} / {TOTAL} güvenlik kuralı doğrulandı
              </Text>
            </View>
            <View
              testID="security-guide-progressbar"
              accessibilityRole="progressbar"
              accessibilityLabel="Güvenlik kontrolü ilerlemesi"
              accessibilityValue={{
                min: 0,
                max: TOTAL,
                now: completed,
                text: `${completed} / ${TOTAL} kontrol tamamlandı`,
              }}
              aria-valuemin={0}
              aria-valuemax={TOTAL}
              aria-valuenow={completed}
              aria-valuetext={`${completed} / ${TOTAL} kontrol tamamlandı`}
              style={styles.track}
            >
              <View style={[styles.fill, { width: `${progress}%` }]} />
            </View>
            <Text style={shared.caption}>
              İşaretler kişisel kontrol notudur; platformda ödeme veya ürün
              onayı vermez.
            </Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Güvenlik kontrollerini sıfırla"
                disabled={completed === 0}
                accessibilityState={{ disabled: completed === 0 }}
                onPress={() => setCheckedIds(new Set())}
                style={({ pressed }) => [
                  shared.button,
                  styles.reset,
                  completed === 0 && styles.disabled,
                  pressed && shared.pressed,
                ]}
              >
                <RotateCcw size={16} color={colors.cyan} />
                <Text style={shared.buttonText}>Sıfırla</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Güvenlik rehberini kapat"
                onPress={onClose}
                style={({ pressed }) => [
                  styles.done,
                  pressed && shared.pressed,
                ]}
              >
                <Text style={styles.doneText}>Kapat</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      paddingHorizontal: 12,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sheet: {
      width: '100%',
      maxWidth: 680,
      minWidth: 0,
      height: '100%',
      maxHeight: 960,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 20,
      overflow: 'hidden',
    },
    header: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    headerContent: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    headerText: { flex: 1, minWidth: 0, gap: 6 },
    subtitle: { color: colors.amber, fontSize: 13, fontWeight: '700' },
    close: {
      minHeight: 44,
      minWidth: 44,
      borderRadius: 12,
      backgroundColor: colors.inset,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { flexGrow: 1, padding: 16, paddingBottom: 40, gap: 18 },
    phase: { gap: 12 },
    badge: {
      borderWidth: 1,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      maxWidth: '100%',
      flexShrink: 1,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '800',
      lineHeight: 17,
      flexShrink: 1,
    },
    checkpoint: {
      minWidth: 44,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.inset,
    },
    checkpointText: { flex: 1, minWidth: 0, gap: 8 },
    checked: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSelected,
    },
    checkedLabel: { color: colors.cyan, fontWeight: '600' },
    source: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sourceText: {
      color: colors.cyan,
      fontSize: 13,
      lineHeight: 20,
      flex: 1,
      textDecorationLine: 'underline',
    },
    linkError: { color: colors.dangerText, fontSize: 13, lineHeight: 20 },
    footer: {
      padding: 16,
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    track: {
      height: 7,
      backgroundColor: colors.track,
      borderRadius: 4,
      overflow: 'hidden',
    },
    fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
    actions: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
    reset: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    done: {
      flex: 1,
      minHeight: 44,
      minWidth: 0,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.accent,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    doneText: { color: colors.onAccent, fontSize: 14, fontWeight: '700' },
    disabled: { opacity: 0.45 },
  });
