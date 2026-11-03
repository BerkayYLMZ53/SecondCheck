import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Globe, ShieldCheck, createLucideIcon } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import profileImage from '../assets/profile.png';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import type { ThemeColors } from '../context/ThemeContext';

// Brand marks use Lucide's renderer; current Lucide releases omit brand exports.
const GithubIcon = createLucideIcon('Github', [
  ['path', { d: 'M9 19c-4.3 1.3-4.3-2.5-6-3m12 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 18.91 1S17.73.65 15 2.48a13.38 13.38 0 0 0-7 0C5.27.65 4.09 1 4.09 1A5.07 5.07 0 0 0 4 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8 18.13V22', key: 'mark' }],
]);
const LinkedinIcon = createLucideIcon('Linkedin', [
  ['path', { d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z', key: 'mark' }],
  ['rect', { x: '2', y: '9', width: '4', height: '12', key: 'bar' }],
  ['circle', { cx: '4', cy: '4', r: '2', key: 'dot' }],
]);

interface SocialLink {
  title: string;
  label: string;
  url: string;
  icon: LucideIcon;
}

const SOCIAL_LINKS: readonly SocialLink[] = [
  { title: 'GitHub', label: '@BerkayYLMZ53', url: 'https://github.com/BerkayYLMZ53', icon: GithubIcon },
  { title: 'LinkedIn', label: 'Berkay Yılmaz', url: 'https://www.linkedin.com/in/berkay-yilmaz-253ab0292/', icon: LinkedinIcon },
  { title: 'Kişisel Web Sitesi', label: 'berkayylmz.com.tr', url: 'https://berkayylmz.com.tr', icon: Globe },
];

interface Props {
  navigation?: ReactNode;
}

export default function ProfileScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [linkError, setLinkError] = useState<string | null>(null);

  const openLink = async (link: SocialLink): Promise<void> => {
    setLinkError(null);
    try {
      await Linking.openURL(link.url);
    } catch {
      setLinkError(`${link.title} bağlantısı açılamadı. Lütfen tekrar deneyin.`);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.safeArea}>
      {navigation}
      <ScrollView
        testID="profile-screen"
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>SECONDCHECK</Text>
          <View style={styles.titleRow}>
            <Text accessibilityRole="header" style={styles.title}>Profil & Hakkında</Text>
            <ThemeToggle />
          </View>
          <Text style={styles.subtitle}>Teknolojinin arkasındaki isim.</Text>
        </View>

        <View style={[styles.card, styles.developerCard]}>
          <View style={styles.avatarGlow}>
            <Image
              source={profileImage}
              accessibilityLabel="Berkay Yılmaz profil fotoğrafı"
              style={styles.avatar}
              resizeMode="cover"
            />
          </View>
          <Text accessibilityRole="header" style={styles.name}>Berkay Yılmaz</Text>
          <Text style={styles.role}>Kurucu & Geliştirici</Text>
          <View style={styles.badge}>
            <ShieldCheck size={14} color={colors.cyan} />
            <Text style={styles.badgeText}>Teknolojide güven, her adımda.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <View style={styles.accentBar} />
            <Text accessibilityRole="header" style={styles.cardTitle}>SecondCheck Hakkında</Text>
          </View>
          <Text style={styles.description}>
            SecondCheck, ikinci el teknoloji ve donanım alışverişinde ekspertiz gücünü cebinize getiren; piyasa analizi, donanım sağlığı ve kronik sorun kontrolü sağlayan yeni nesil bir değerleme platformudur.
          </Text>
        </View>

        <View style={styles.linksSection}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Bağlantılar</Text>
          {SOCIAL_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <TouchableOpacity
                key={link.url}
                accessibilityRole="link"
                accessibilityLabel={`${link.title}: ${link.label}`}
                accessibilityHint="Bağlantıyı tarayıcıda açar"
                activeOpacity={0.65}
                onPress={() => { void openLink(link); }}
                style={styles.linkButton}
              >
                <View style={styles.iconBox}>
                  <Icon size={22} color={colors.cyan} strokeWidth={1.8} />
                </View>
                <View style={styles.linkCopy}>
                  <Text style={styles.linkTitle}>{link.title}</Text>
                  <Text style={styles.linkLabel}>{link.label}</Text>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
          {linkError !== null && (
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>
              {linkError}
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>SecondCheck v1.0.0</Text>
          <Text style={styles.copyright}>Tüm Hakları Saklıdır © 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    scroll: { flex: 1 },
    content: {
      width: '100%', maxWidth: 680, alignSelf: 'center',
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 24,
    },
    heading: { gap: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    eyebrow: { color: colors.cyan, fontSize: 11, fontWeight: '800', letterSpacing: 2.5 },
    title: { flex: 1, color: colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
    subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    card: {
      padding: 24, borderRadius: 24, backgroundColor: colors.cardBg,
      borderWidth: 1, borderColor: colors.cardBorder,
    },
    developerCard: { alignItems: 'center', paddingVertical: 32 },
    avatarGlow: {
      borderRadius: 55, backgroundColor: colors.cardBg, marginBottom: 20,
      boxShadow: `0px 0px 24px ${colors.cyan}26`,
    },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: colors.cyan },
    name: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', textAlign: 'center' },
    role: { color: colors.cyan, fontSize: 14, marginTop: 6, textAlign: 'center' },
    badge: {
      flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
      backgroundColor: colors.accentSoft, maxWidth: '100%',
    },
    badgeText: { color: colors.cyan, fontSize: 12, lineHeight: 18, flexShrink: 1 },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    accentBar: { width: 3, height: 20, borderRadius: 2, backgroundColor: colors.accent },
    cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', flexShrink: 1 },
    description: { color: colors.textSecondary, fontSize: 15, lineHeight: 25 },
    linksSection: { gap: 12 },
    sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 2 },
    linkButton: {
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
      minHeight: 80, borderRadius: 18, backgroundColor: colors.cardBg,
      borderWidth: 1, borderColor: colors.cardBorder,
    },
    iconBox: {
      width: 44, height: 44, borderRadius: 14,
      backgroundColor: colors.accentSelected,
      alignItems: 'center', justifyContent: 'center',
    },
    linkCopy: { flex: 1, minWidth: 0, gap: 4 },
    linkTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
    linkLabel: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
    error: { color: colors.dangerText, fontSize: 13, lineHeight: 20 },
    footer: { alignItems: 'center', gap: 6, paddingTop: 4 },
    version: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    copyright: { color: colors.textSecondary, fontSize: 12, textAlign: 'center' },
  });
};
