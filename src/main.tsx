import { Authenticator } from '@aws-amplify/ui-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Amplify } from 'aws-amplify';
import { PrimeReactProvider } from 'primereact/api';
import React from 'react';
import ReactDOM from 'react-dom/client';
import outputs from '../amplify_outputs.json';
// Vendor CSS (PrimeReact core, PrimeFlex, primeicons, Amplify UI) is imported
// from index.css so it can be assigned a cascade layer. The PrimeReact theme is
// loaded and swapped at runtime by ThemeProvider.
import './index.css';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });

const queryClient = new QueryClient();

// register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById('root')!, {
  // React 19 replaces its own console reporting when this is supplied, so the
  // console.error is not decorative — without it every uncaught render error
  // would vanish from the one channel this app is verified through.
  onUncaughtError: (error, errorInfo) => {
    console.error('Uncaught render error:', error, errorInfo.componentStack);
  },
}).render(
  // ErrorBoundary wraps the whole provider stack rather than sitting inside it:
  // a throw from QueryClientProvider or Authenticator.Provider would otherwise
  // escape and white-screen the app, which is the case this exists for.
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Authenticator.Provider>
          <PrimeReactProvider>
            <AuthProvider>
              <ThemeProvider>
                <RouterProvider router={router} />
              </ThemeProvider>
            </AuthProvider>
          </PrimeReactProvider>
        </Authenticator.Provider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
