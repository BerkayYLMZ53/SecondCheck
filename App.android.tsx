// Copyright © 2026 Berkay Yılmaz
// SPDX-License-Identifier: AGPL-3.0-only

import {
  ThemeProvider,
  useTheme,
  useThemedStyles,
} from './context/ThemeContext';
import type { ThemeColors } from './context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import type { AppTab } from './components/FloatingTabBar';
import type { Product } from './types/product';
import type { ComparisonPair } from './utils/comparison';
import type { SavedComparisonPair, SavedItem } from './types/savedListing';
import { getProductById } from './data/devices';
import { hideNativeSplash } from './utils/startup';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Never wait for assets, animations or a native promise on Android.
    void hideNativeSplash();
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <ErrorBoundary>
      {mounted ? <AndroidProviders /> : <View style={{ flex: 1, backgroundColor: '#0b0f19' }} />}
    </ErrorBoundary>
  );
}

function AndroidProviders() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SavedListingsProvider } = require('./context/SavedListingsContext') as typeof import('./context/SavedListingsContext');
  return <ThemeProvider><SavedListingsProvider><Application /></SavedListingsProvider></ThemeProvider>;
}

function DiagnosticsScreen({ active }: { active: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Screen = (require('./screens/DiagnosticsScreen') as typeof import('./screens/DiagnosticsScreen')).default;
  return <Screen active={active} />;
}

function Application() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AnalysisPresentationProvider } = require('./context/AnalysisPresentationContext') as typeof import('./context/AnalysisPresentationContext');

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HomeScreen = (require('./screens/HomeScreen') as typeof import('./screens/HomeScreen')).default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const CompareScreen = (require('./screens/CompareScreen') as typeof import('./screens/CompareScreen')).default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ProfileScreen = (require('./screens/ProfileScreen') as typeof import('./screens/ProfileScreen')).default;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FloatingTabBar = (require('./components/FloatingTabBar') as typeof import('./components/FloatingTabBar')).default;
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [tab, setTab] = useState<AppTab>('home');
  const [diagnosticsVisited, setDiagnosticsVisited] = useState(false);
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
      <AnalysisPresentationProvider active={tab === 'home'} enabled>
      <View style={styles.root}>
        <StatusBar
          style={theme === 'dark' ? 'light' : 'dark'}
        />
        <View
          style={styles.screen}
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
          {diagnosticsVisited && <View
            style={[styles.screen, tab !== 'diagnostics' && styles.hidden]}
            aria-hidden={tab !== 'diagnostics'}
            accessibilityElementsHidden={tab !== 'diagnostics'}
            importantForAccessibility={tab === 'diagnostics' ? 'auto' : 'no-hide-descendants'}
          >
            <ErrorBoundary><DiagnosticsScreen active={tab === 'diagnostics'} /></ErrorBoundary>
          </View>}
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
          <FloatingTabBar activeTab={tab} onTabPress={(next) => { Keyboard.dismiss(); if (next === 'diagnostics') setDiagnosticsVisited(true); setTab(next); }} />
        </View>
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
