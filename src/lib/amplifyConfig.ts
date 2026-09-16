import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

// Imported for its side effect, first, from main.tsx. Data clients are created
// on first use (@/lib/dataClient), so nothing depends on this module being
// evaluated before the others.
Amplify.configure(outputs);
