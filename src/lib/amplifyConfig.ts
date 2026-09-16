import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

// Imported for its side effect, and first, from main.tsx. Imports are hoisted,
// so anything main.tsx imports is evaluated before main.tsx's own statements —
// and several modules call generateClient() at load, which reads the config and
// warns if Amplify.configure() has not run yet.
Amplify.configure(outputs);
