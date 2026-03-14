import { FileUploader } from '@aws-amplify/ui-react-storage';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { createImageUploadMetadata } from '../../../../lib/s3-metadata-utils';
import styles from './AmplifyFileUploader.module.css';

const UPLOAD_PATH = 'uploads/';

interface AmplifyFileUploaderProps {
  onUploadSuccess: (event: { key?: string; fileType?: string }) => void;
  galleryId?: string;
}

const AmplifyFileUploader = ({ onUploadSuccess, galleryId }: AmplifyFileUploaderProps) => {
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

  const processFile = ({ file, key }: { file: File; key: string }) => {
    const metadata = createImageUploadMetadata({
      galleryId,
      title: file.name,
      description: '',
      fileName: file.name,
      s3Key: `${UPLOAD_PATH}${key}`,
    });

    return { file, key, metadata };
  };

  return (
    <div className={styles.uploader}>
      <Toast ref={toast} />
      <FileUploader
        acceptedFileTypes={['image/*']}
        path={UPLOAD_PATH}
        maxFileCount={10}
        isResumable={true}
        showThumbnails={false}
        onUploadSuccess={onUploadSuccess}
        onUploadError={handleUploadError}
        processFile={processFile}
      />
    </div>
  );
};

export default AmplifyFileUploader;
