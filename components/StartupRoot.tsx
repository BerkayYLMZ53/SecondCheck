import type { ComponentType } from 'react';
import ErrorBoundary from './ErrorBoundary';

function LoadApplication() {
  // Evaluate application imports inside the boundary, so module-load errors
  // can also display the recovery screen instead of aborting registration.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Application = (require('../App') as { default: ComponentType }).default;
  return <Application />;
}

export default function StartupRoot() {
  return <ErrorBoundary><LoadApplication /></ErrorBoundary>;
}
