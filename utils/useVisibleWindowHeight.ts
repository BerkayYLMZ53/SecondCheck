import { useWindowDimensions } from 'react-native';
export function useVisibleWindowHeight(): number { return useWindowDimensions().height; }
