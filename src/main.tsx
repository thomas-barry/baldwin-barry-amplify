import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './index.css';
import type { Schema } from '../amplify/data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);

const client = generateClient<Schema>();

console.log('client', client);

client.queries
  .sayHello({
    name: 'Amplify',
  })
  .then(response => {
    console.log('response', response);
  })
  .catch(error => {
    console.error('error', error);
  });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
