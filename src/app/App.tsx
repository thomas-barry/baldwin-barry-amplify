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
  return (
    <main className={styles.container}>
      <img src={facePalm} alt="face palm portrait" className={styles.facePalmImage} />
      <div className={styles.banner}>Thomas Baldwin Barry</div>
      {/* <div className={styles.banner}>{greeting || 'Loading greeting...'}</div> */}
      {/* <StorageImage bucket={bucket} path="_U8A0066.jpg" /> */}
    </main>
  );
}

export default App;
