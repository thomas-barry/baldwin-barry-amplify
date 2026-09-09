/* This is the only class component in the codebase, and it has to be.
 *
 * React provides no hook-based error boundary: `getDerivedStateFromError` and
 * `componentDidCatch` exist on classes and have no functional equivalent, and
 * the React team has said repeatedly that they have no plans to add one. So
 * this file is a deliberate exception to the functional-components-only
 * convention in CLAUDE.md, not an oversight. Please do not "modernise" it.
 *
 * The fallback deliberately uses no PrimeReact components and no context. If
 * PrimeReact or a provider is what threw, a fallback that depends on either
 * would throw again and take the boundary down with it. */

import React from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      // The boundary sits outside ThemeProvider, so `data-theme` may never have
      // been applied. :root carries the light tokens as defaults, so this
      // renders correctly either way — just always light after an early throw.
      <div
        className={styles.container}
        role='alert'>
        <div className={styles.panel}>
          <h1 className={styles.heading}>Something went wrong</h1>
          <p className={styles.body}>The page hit an error it could not recover from. Reloading usually clears it.</p>
          {error.message && <pre className={styles.detail}>{error.message}</pre>}
          <button
            type='button'
            className={styles.button}
            onClick={() => window.location.reload()}>
            Reload the page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
