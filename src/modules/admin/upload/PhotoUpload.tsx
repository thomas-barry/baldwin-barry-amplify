import AmplifyFileUploader from '@/modules/galleries/components/amplify-file-uploader/AmplifyFileUploader';
import type { Schema } from '@/schema';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Dropdown } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useRef, useState } from 'react';
import styles from './PhotoUpload.module.css';

const clientRead = generateClient<Schema>({ authMode: 'apiKey' });

interface GalleryOption {
  label: string;
  value: string;
}

const PhotoUpload = () => {
  const toast = useRef<Toast>(null);

  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);

  const { data: galleryOptions, isLoading: galleriesLoading } = useQuery({
    queryKey: ['galleries'],
    queryFn: async (): Promise<GalleryOption[]> => {
      const response = await clientRead.models.Gallery.list({
        selectionSet: ['id', 'name'],
      });
      return (response.data ?? []).map(g => ({ label: g.name, value: g.id }));
    },
  });

  const handleUploadSuccess = () => {
    toast.current?.show({ severity: 'success', summary: 'Uploaded', detail: 'Photo added to gallery', life: 3000 });
  };

  return (
    <div className={styles.page}>
      <Toast ref={toast} />
      <h1 className={styles.heading}>Upload Photos</h1>

      {galleriesLoading ? (
        <ProgressSpinner />
      ) : (
        <div className={styles.form}>
          <label className={styles.label}>Gallery</label>
          <Dropdown
            value={selectedGalleryId}
            options={galleryOptions ?? []}
            onChange={e => setSelectedGalleryId(e.value)}
            placeholder='Select a gallery'
            className={styles.dropdown}
          />

          {/* The gallery is baked into each file's S3 metadata as the upload
              starts, and there is no retry — so the uploader stays out of the
              DOM until there is a gallery to bake in. */}
          {selectedGalleryId ? (
            <AmplifyFileUploader
              galleryId={selectedGalleryId}
              showThumbnails
              onUploadSuccess={handleUploadSuccess}
            />
          ) : (
            <p className={styles.hint}>Choose a gallery to upload into.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoUpload;
