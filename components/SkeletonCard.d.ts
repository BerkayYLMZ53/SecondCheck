import type { ReactElement } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface SkeletonCardProps {
  active?: boolean;
  compact?: boolean;
  label?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}
export default function SkeletonCard(props: SkeletonCardProps): ReactElement;
