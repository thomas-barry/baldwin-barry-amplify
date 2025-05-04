import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './index.css';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
//# sourceMappingURL=main.js.map