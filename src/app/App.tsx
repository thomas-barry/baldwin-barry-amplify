import { Authenticator } from '@aws-amplify/ui-react';
import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { useRef, useState } from 'react';
import facePalmImage from '../assets/facepalm.jpg';
import AmplifyFileUploader from '../components/AmplifyFileUploader';
import GalleryList from '../components/GalleryList';
import styles from './App.module.css';

// Import type for our data schema
import type { Schema } from '../../amplify/data/resource';

// import { StorageImage } from '@aws-amplify/ui-react-storage';

function App() {
  const toast = useRef<Toast>(null);
  const [refreshGalleryTrigger, setRefreshGalleryTrigger] = useState(0);

  // Generate the client for our Amplify data models
  const client = generateClient<Schema>();

  const handleCreateGallery = async () => {
    try {
      // Create a new gallery with current timestamp
      const result = await client.models.Gallery.create({
        name: `Gallery ${new Date().toLocaleString()}`,
        description: 'A new gallery created from the app',
        createdDate: new Date().toISOString(),
      });

      // Show success message
      toast.current?.show({
        severity: 'success',
        summary: 'Gallery Created',
        detail: `Created gallery "${result.data?.name || 'New Gallery'}" successfully!`,
        life: 3000,
      });

      // Trigger gallery list refresh
      setRefreshGalleryTrigger(prev => prev + 1);

      console.log('Created gallery:', result);
    } catch (error) {
      // Show error message
      toast.current?.show({
        severity: 'error',
        summary: 'Creation Failed',
        detail: error instanceof Error ? error.message : 'Failed to create gallery',
        life: 5000,
      });
      console.error('Error creating gallery:', error);
    }
  };

  return (
    <Authenticator>
      <main className={styles.container}>
        <Toast ref={toast} />
        <img
          src={facePalmImage}
          alt='face palm portrait'
          className={styles.facePalmImage}
        />
        <div className={styles.banner}>Thomas Baldwin Barry</div>

        <Button
          label='Create New Gallery'
          icon='pi pi-plus'
          className={styles.createGalleryButton}
          onClick={handleCreateGallery}
        />

        <GalleryList refreshTrigger={refreshGalleryTrigger} />

        <AmplifyFileUploader />
        {/* <StorageImage bucket={bucket} path="_U8A0066.jpg" /> */}
      </main>
    </Authenticator>
  );
}

export default App;
