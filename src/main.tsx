import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Amplify } from 'aws-amplify';
import { PrimeReactProvider } from 'primereact/api';
import React from 'react';
import ReactDOM from 'react-dom/client';
import outputs from '../amplify_outputs.json';
import './index.css';

import 'primeflex/primeflex.css'; // flex utilities
import 'primeicons/primeicons.css'; // icons
import 'primereact/resources/primereact.min.css'; // core css
import 'primereact/resources/themes/saga-blue/theme.css'; // theme

import { AuthProvider } from '@/context/AuthContext';
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <PrimeReactProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </PrimeReactProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
