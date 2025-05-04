import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// import { useEffect, useState } from 'react';
// import type { Schema } from '../../amplify/data/resource';
// import { generateClient } from 'aws-amplify/data';
import styles from './App.module.css';
import facePalm from '../assets/facepalm.jpg';
// const client = generateClient<Schema>();
function App() {
    return (_jsxs("main", { className: styles.container, children: [_jsx("img", { src: facePalm, alt: "Facepalm", className: styles.facePalm }), _jsx("div", { className: styles.banner, children: "Thomas Baldwin Barry" })] }));
}
export default App;
//# sourceMappingURL=App.js.map