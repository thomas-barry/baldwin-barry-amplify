import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// import { useEffect, useState } from 'react';
// import type { Schema } from '../../amplify/data/resource';
// import { generateClient } from 'aws-amplify/data';
import styles from './App.module.css';
import facePalm from '../assets/facepalm.jpg';
// import { StorageImage } from '@aws-amplify/ui-react-storage';
// const client = generateClient<Schema>();
// const bucket = {
//   bucketName: 'media-217260976694-us-east-1',
//   region: 'us-east-1',
//   accessLevel: 'guest',
// };
function App() {
    return (_jsxs("main", { className: styles.container, children: [_jsx("img", { src: facePalm, alt: "face palm portrait", className: styles.facePalmImage }), _jsx("div", { className: styles.banner, children: "Thomas Baldwin Barry" })] }));
}
export default App;
//# sourceMappingURL=App.js.map