import {
  ThemeProvider,
  useTheme,
  useThemedStyles,
} from './context/ThemeContext';
import type { ThemeColors } from './context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import HomeScreen from './screens/HomeScreen';
import CompareScreen from './screens/CompareScreen';
import ProfileScreen from './screens/ProfileScreen';
import DiagnosticsScreen from './screens/DiagnosticsScreen';
import FloatingTabBar from './components/FloatingTabBar';
import type { AppTab } from './components/FloatingTabBar';
import type { Product } from './types/product';
import type { ComparisonPair } from './utils/comparison';
import WebPageStyles from './components/WebPageStyles';
import { SavedListingsProvider } from './context/SavedListingsContext';
import SplashScreen from './components/SplashScreen';
import type { SavedComparisonPair, SavedItem } from './types/savedListing';
import { getProductById } from './data/devices';
import { AnalysisPresentationProvider } from './context/AnalysisPresentationContext';

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
  const [isReady, setIsReady] = useState(false);
  const showSplash = !isReady;
  const finishSplash = useCallback(() => setIsReady(true), []);
  const styles = useThemedStyles(createStyles);
  const [tab, setTab] = useState<AppTab>('home');
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
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AnalysisPresentationProvider active={tab === 'home'} enabled={!showSplash}>
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
              active={tab === 'home'}
              onCompareProducts={openComparison}
              onCompareSavedListings={openSavedComparison}
            />
          </View>
          <View
            style={[styles.screen, tab !== 'diagnostics' && styles.hidden]}
            aria-hidden={tab !== 'diagnostics'}
            accessibilityElementsHidden={tab !== 'diagnostics'}
            importantForAccessibility={tab === 'diagnostics' ? 'auto' : 'no-hide-descendants'}
          >
            <DiagnosticsScreen active={tab === 'diagnostics'} />
          </View>
          {tab === 'compare' && (
            <View style={styles.screen}>
              <CompareScreen
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
              <ProfileScreen />
            </View>
          )}
          {!showSplash && <FloatingTabBar activeTab={tab} onTabPress={(next) => { Keyboard.dismiss(); setTab(next); }} />}
        </View>
        {showSplash && <SplashScreen onFinish={finishSplash} />}
      </View>
      </AnalysisPresentationProvider>
    </SafeAreaProvider>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: colors.bg },
    screen: { flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' },
    hidden: { display: 'none' },
  });
