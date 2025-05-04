// import { useEffect, useState } from 'react';
// import type { Schema } from '../../amplify/data/resource';
// import { generateClient } from 'aws-amplify/data';
import styles from './App.module.css';
import facePalm from '../assets/facepalm.jpg';

// const client = generateClient<Schema>();

function App() {
  return (
    <main className={styles.container}>
      <img src={facePalm} alt="Facepalm" className={styles.facePalm} />
      <div className={styles.banner}>Thomas Baldwin Barry</div>
    </main>
  );
}

export default App;
