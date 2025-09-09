import React, { Suspense, lazy } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

// Lazy load components with error boundaries
const createLazyComponent = (importFunc, fallback = null) => {
  const LazyComponent = lazy(importFunc);

  return props => (
    <Suspense
      fallback={fallback || <LoadingSpinner size="large" text="Loading..." />}
    >
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Lazy loaded components
export const LazyGameLobby = createLazyComponent(() => import('../GameLobby'));
export const LazyGameWindow = createLazyComponent(
  () => import('../GameWindow')
);
export const LazyLandingSection = createLazyComponent(
  () => import('../LandingSection')
);
export const LazyFeaturesSection = createLazyComponent(
  () => import('../FeaturesSection')
);
export const LazyHowItWorksSection = createLazyComponent(
  () => import('../HowItWorksSection')
);

// Error boundary for lazy components
export class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong loading this component.</h2>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
