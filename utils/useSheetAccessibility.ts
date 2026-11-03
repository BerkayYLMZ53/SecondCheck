import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export function useSheetAccessibility(open: boolean, _testID: string, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => handler.remove();
  }, [open, onClose]);
}
