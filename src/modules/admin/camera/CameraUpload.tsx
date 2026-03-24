import { createImageUploadMetadata } from '@/lib/s3-metadata-utils';
import type { Schema } from '@/schema';
import { UPLOADS_PREFIX } from '../../../../constants';
import { useQuery } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { uploadData } from 'aws-amplify/storage';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { useRef, useState } from 'react';
import styles from './CameraUpload.module.css';

const clientRead = generateClient<Schema>({ authMode: 'apiKey' });

interface GalleryOption {
  label: string;
  value: string;
}

const CameraUpload = () => {
  const toast = useRef<Toast>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: galleryOptions, isLoading: galleriesLoading } = useQuery({
    queryKey: ['galleries'],
    queryFn: async (): Promise<GalleryOption[]> => {
      const response = await clientRead.models.Gallery.list({
        selectionSet: ['id', 'name'],
      });
      return (response.data ?? []).map(g => ({ label: g.name, value: g.id }));
    },
  });

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!capturedFile || !selectedGalleryId) return;

    setUploading(true);
    try {
      const ext = capturedFile.name.split('.').pop() ?? 'jpg';
      const key = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${UPLOADS_PREFIX}${key}`;

      const metadata = createImageUploadMetadata({
        galleryId: selectedGalleryId,
        title: capturedFile.name,
        fileName: capturedFile.name,
        s3Key: path,
      });

      await uploadData({
        path,
        data: capturedFile,
        options: { contentType: capturedFile.type, metadata },
      }).result;

      toast.current?.show({ severity: 'success', summary: 'Uploaded', detail: 'Photo added to gallery', life: 3000 });
      setCapturedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      toast.current?.show({ severity: 'error', summary: 'Upload failed', detail: String(err), life: 4000 });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Toast ref={toast} />
      <h1 className={styles.heading}>Camera Upload</h1>

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

          <input
            ref={inputRef}
            type='file'
            accept='image/*'
            capture='environment'
            className={styles.hiddenInput}
            onChange={handleCapture}
          />

          <Button
            label='Take Photo'
            icon='pi pi-camera'
            onClick={() => inputRef.current?.click()}
            className={styles.cameraBtn}
            disabled={uploading}
          />

          {previewUrl && (
            <div className={styles.preview}>
              <img src={previewUrl} alt='Preview' className={styles.previewImage} />
            </div>
          )}

          {capturedFile && (
            <Button
              label={uploading ? 'Uploading…' : 'Upload Photo'}
              icon={uploading ? 'pi pi-spin pi-spinner' : 'pi pi-upload'}
              onClick={handleUpload}
              disabled={!selectedGalleryId || uploading}
              className={styles.uploadBtn}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default CameraUpload;
