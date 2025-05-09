import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// import { generateClient } from 'aws-amplify/data';
// import type { Schema } from '../../amplify/data/resource';
import styles from './App.module.css';
import facePalmImage from '../assets/facepalm.jpg';
import S3FileUploader from '../components/S3FileUploader';
// import { StorageImage } from '@aws-amplify/ui-react-storage';
// Create data client with the schema type
// const client = generateClient<Schema>();
function App() {
    return (_jsxs("main", { className: styles.container, children: [_jsx("img", { src: facePalmImage, alt: "face palm portrait", className: styles.facePalmImage }), _jsx("div", { className: styles.banner, children: "Thomas Baldwin Barry" }), _jsx(S3FileUploader, {})] }));
}
export default App;
//# sourceMappingURL=App.js.map