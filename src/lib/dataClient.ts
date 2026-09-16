import type { Schema } from '@/schema';
import { generateClient } from 'aws-amplify/data';

// generateClient() reads the Amplify config when it is called, so a client
// created at module load warns if that module is evaluated before
// Amplify.configure(). Import order in main.tsx cannot prevent that: the
// production build moves shared modules into separate chunks, which the entry
// chunk evaluates before its own body. Creating clients on first use does.

function lazy<T>(create: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= create());
}

/** Client for public reads (API key). */
export const getPublicClient = lazy(() => generateClient<Schema>({ authMode: 'apiKey' }));

/** Client for admin reads and writes (Cognito user pool). */
export const getAdminClient = lazy(() => generateClient<Schema>({ authMode: 'userPool' }));
