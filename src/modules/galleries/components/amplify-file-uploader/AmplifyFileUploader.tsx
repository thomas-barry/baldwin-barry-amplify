import { createImageUploadMetadata } from '@/lib/s3-metadata-utils';
import { createUploadKey } from '@/lib/uploadKey';
import { FileUploader } from '@aws-amplify/ui-react-storage';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { UPLOADS_PREFIX } from '../../../../../constants';
import styles from './AmplifyFileUploader.module.css';

interface AmplifyFileUploaderProps {
  onUploadSuccess: (event: { key?: string; fileType?: string }) => void;
  galleryId?: string;
  // Off by default so the gallery editor keeps its compact file list. Worth
  // turning on where a batch is picked from a photo library and the previews
  // are how you notice you grabbed the wrong ones.
  showThumbnails?: boolean;
}

const AmplifyFileUploader = ({ onUploadSuccess, galleryId, showThumbnails = false }: AmplifyFileUploaderProps) => {
  const toast = useRef<Toast>(null);

  const handleUploadError = (error: string) => {
    console.error('upload error:', error);
    toast.current?.show({
      severity: 'error',
      summary: 'upload failed',
      detail: error || 'failed to upload image',
      life: 5000,
    });
  };

  // FileUploader would store the file under its own name, where a second
  // upload with the same name replaces the first. `key` is relative to `path`.
  const processFile = ({ file }: { file: File; key: string }) => {
    const { key } = createUploadKey(file);
    const metadata = createImageUploadMetadata({
      galleryId,
      title: file.name,
      description: '',
      fileName: file.name,
      s3Key: key,
    });

    return { file, key: key.slice(UPLOADS_PREFIX.length), metadata };
  };

  return (
    <div className={styles.uploader}>
      <Toast ref={toast} />
      <FileUploader
        acceptedFileTypes={['image/*']}
        path={UPLOADS_PREFIX}
        maxFileCount={10}
        isResumable={true}
        showThumbnails={showThumbnails}
        onUploadSuccess={onUploadSuccess}
        onUploadError={handleUploadError}
        processFile={processFile}
      />
    </div>
  );
};

export default AmplifyFileUploader;
