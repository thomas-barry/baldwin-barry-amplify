import { FileUploader } from '@aws-amplify/ui-react-storage';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';
import { createImageUploadMetadata } from '../../../../lib/s3-metadata-utils';

const UPLOAD_PATH = 'uploads/';

interface AmplifyFileUploaderProps {
  onUploadSuccess: (event: { key?: string; fileType?: string }) => void;
  galleryId?: string;
  imageTitle?: string;
  imageDescription?: string;
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

  // Process file to add metadata before upload
  const processFile = ({ file, key }: { file: File; key: string }) => {
    const metadata = createImageUploadMetadata({
      galleryId,
      title: file.name,
      description: '',
      fileName: file.name,
      s3Key: `${UPLOAD_PATH}${key}`,
    });

    console.log('Adding metadata to S3 upload:', metadata);

    return {
      file,
      key,
      metadata,
    };
  };

  return (
    <Card className='mt-5'>
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
    </Card>
  );
};

export default AmplifyFileUploader;
