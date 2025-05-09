import styles from './App.module.css';
import facePalmImage from '../assets/facepalm.jpg';
import S3FileUploader from '../components/S3FileUploader';

// import { StorageImage } from '@aws-amplify/ui-react-storage';

function App() {
  return (
    <main className={styles.container}>
      <img
        src={facePalmImage}
        alt='face palm portrait'
        className={styles.facePalmImage}
      />
      <div className={styles.banner}>Thomas Baldwin Barry</div>
      <S3FileUploader />
      {/* <StorageImage bucket={bucket} path="_U8A0066.jpg" /> */}
    </main>
  );
}

export default App;
