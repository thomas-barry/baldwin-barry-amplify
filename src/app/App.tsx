import { Authenticator } from '@aws-amplify/ui-react';
import facePalmImage from '../assets/facepalm.jpg';
import AmplifyFileUploader from '../components/AmplifyFileUploader';
import styles from './App.module.css';

// import { StorageImage } from '@aws-amplify/ui-react-storage';

function App() {
  return (
    <Authenticator>
      <main className={styles.container}>
        <img
          src={facePalmImage}
          alt='face palm portrait'
          className={styles.facePalmImage}
        />
        <div className={styles.banner}>Thomas Baldwin Barry</div>
        <AmplifyFileUploader />
        {/* <StorageImage bucket={bucket} path="_U8A0066.jpg" /> */}
      </main>
    </Authenticator>
  );
}

export default App;
