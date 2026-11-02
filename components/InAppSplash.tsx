import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import logo from '../assets/icon.png';

interface InAppSplashProps {
  ready: boolean;
  onFinish: () => void;
}

export default function InAppSplash({ ready, onFinish }: InAppSplashProps) {
  const insets = useSafeAreaInsets();
  const [opacity] = useState(() => new Animated.Value(1));
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [deadlineElapsed, setDeadlineElapsed] = useState(false);

  useEffect(() => {
    const minimum = setTimeout(() => setMinimumElapsed(true), 1200);
    // A storage failure or slow device must never leave the splash stuck.
    const deadline = setTimeout(() => setDeadlineElapsed(true), 1500);
    return () => {
      clearTimeout(minimum);
      clearTimeout(deadline);
    };
  }, []);

  const canDismiss = minimumElapsed && (ready || deadlineElapsed);
  useEffect(() => {
    if (!canDismiss) return;
    const animation = Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished) onFinish();
    });
    return () => animation.stop();
  }, [canDismiss, onFinish, opacity]);

  return (
    <Animated.View
      testID="in-app-splash"
      style={[styles.overlay, { opacity }]}
      accessibilityLabel="SecondCheck yükleniyor"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
    >
      <View style={styles.brand}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator
          size="small"
          color="#64748b"
          style={styles.spinner}
          accessible={false}
        />
      </View>
      <Text style={[styles.tagline, { bottom: Math.max(insets.bottom, 16) + 16 }]}>
        SecondCheck • Donanım Doğrulama
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    backgroundColor: '#0b0f19',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { width: 90, height: 90, alignItems: 'center' },
  logo: { width: 90, height: 90 },
  spinner: { position: 'absolute', top: 114 },
  tagline: {
    position: 'absolute',
    left: 16,
    right: 16,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
