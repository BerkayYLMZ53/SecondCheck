import {
  ThemeProvider,
  useTheme,
  useThemedStyles,
} from './context/ThemeContext';
import type { ThemeColors } from './context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import CompareScreen from './screens/CompareScreen';
import ProfileScreen from './screens/ProfileScreen';
import type { Product } from './types/product';
import type { ComparisonPair } from './utils/comparison';
import WebPageStyles from './components/WebPageStyles';
import {
  SavedListingsProvider,
  useSavedListings,
} from './context/SavedListingsContext';
import InAppSplash from './components/InAppSplash';
import type { SavedComparisonPair, SavedItem } from './types/savedListing';
import { getProductById } from './data/mockProducts';

export default function App() {
  return (
    <ThemeProvider>
      <SavedListingsProvider>
        <Application />
      </SavedListingsProvider>
    </ThemeProvider>
  );
}

function Application() {
  const { theme } = useTheme();
  const { isReady } = useSavedListings();
  const [showSplash, setShowSplash] = useState(true);
  const finishSplash = useCallback(() => setShowSplash(false), []);
  const styles = useThemedStyles(createStyles);
  const [tab, setTab] = useState<'home' | 'compare' | 'profile'>('home');
  const [products, setProducts] = useState<ComparisonPair>([null, null]);
  const [comparedListings, setComparedListings] =
    useState<SavedComparisonPair | null>(null);
  const openComparison = useCallback((a: Product, b: Product) => {
    Keyboard.dismiss();
    setProducts([a, b]);
    setComparedListings(null);
    setTab('compare');
  }, []);
  const openSavedComparison = useCallback((a: SavedItem, b: SavedItem) => {
    const productA = getProductById(a.productId);
    const productB = getProductById(b.productId);
    if (!productA || !productB || productA.category !== productB.category)
      return;
    Keyboard.dismiss();
    setProducts([productA, productB]);
    setComparedListings([a, b]);
    setTab('compare');
  }, []);
  const navigation = (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {(
        [
          ['home', 'Değerleme & Ekspertiz'],
          ['compare', 'Donanım Kıyasla (VS)'],
          ['profile', 'Profil & Hakkında'],
        ] as const
      ).map(([id, label]) => (
        <Pressable
          key={id}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: tab === id }}
          aria-selected={tab === id}
          onPress={() => {
            Keyboard.dismiss();
            setTab(id);
          }}
          style={({ pressed }) => [
            styles.tab,
            tab === id && styles.activeTab,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.tabText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <WebPageStyles />
      <View style={styles.root}>
        <StatusBar
          style={showSplash || theme === 'dark' ? 'light' : 'dark'}
        />
        <View
          style={styles.screen}
          pointerEvents={showSplash ? 'none' : 'auto'}
          aria-hidden={showSplash}
          accessibilityElementsHidden={showSplash}
          importantForAccessibility={showSplash ? 'no-hide-descendants' : 'auto'}
        >
          <View
            style={[styles.screen, tab !== 'home' && styles.hidden]}
            aria-hidden={tab !== 'home'}
            accessibilityElementsHidden={tab !== 'home'}
            importantForAccessibility={
              tab === 'home' ? 'auto' : 'no-hide-descendants'
            }
          >
            <HomeScreen
              navigation={navigation}
              onCompareProducts={openComparison}
              onCompareSavedListings={openSavedComparison}
            />
          </View>
          {tab === 'compare' && (
            <View style={styles.screen}>
              <CompareScreen
                navigation={navigation}
                products={products}
                listings={comparedListings}
                onChange={(next) => {
                  setProducts(next);
                  setComparedListings(null);
                }}
                onSwap={() => {
                  setProducts(([a, b]) => [b, a]);
                  setComparedListings((pair) =>
                    pair ? [pair[1], pair[0]] : null,
                  );
                }}
              />
            </View>
          )}
          {tab === 'profile' && (
            <View style={styles.screen}>
              <ProfileScreen navigation={navigation} />
            </View>
          )}
        </View>
        {showSplash && <InAppSplash ready={isReady} onFinish={finishSplash} />}
      </View>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    tabs: {
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    tab: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    activeTab: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.accent,
    },
    tabText: {
      color: colors.textPrimary,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
      textAlign: 'center',
      flexShrink: 1,
    },
    screen: { flex: 1, minWidth: 0 },
    hidden: { display: 'none' },
    pressed: { opacity: 0.75 },
  });
