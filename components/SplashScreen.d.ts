import type { ReactElement } from 'react';

export interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen(props: SplashScreenProps): ReactElement;
