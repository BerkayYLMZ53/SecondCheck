import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hideNativeSplash } from '../utils/startup';

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SecondCheck application error:', error, info.componentStack);
    void hideNativeSplash();
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    // No providers, custom fonts or native effects are needed for recovery.
    return (
      <View testID="app-error-screen" style={styles.root} onLayout={() => { void hideNativeSplash(); }}>
        <Text accessibilityRole="header" style={styles.title}>Bir sorun oluştu</Text>
        <Text style={styles.message}>
          SecondCheck açılırken beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.
        </Text>
        <Pressable accessibilityRole="button" style={styles.button}
          onPress={() => this.setState({ hasError: false, error: null })}>
          <Text style={styles.buttonText}>Tekrar dene</Text>
        </Pressable>
        <ScrollView style={styles.details}>
          <Text selectable style={styles.message}>
            {String(this.state.error?.stack || this.state.error?.message || this.state.error || 'Bilinmeyen hata')}
          </Text>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0f19', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  message: { color: '#94a3b8', fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 440 },
  details: { maxHeight: 240, alignSelf: 'stretch' },
  button: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
