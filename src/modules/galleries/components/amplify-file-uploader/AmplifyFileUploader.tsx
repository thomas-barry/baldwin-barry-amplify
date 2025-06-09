import { FileUploader } from '@aws-amplify/ui-react-storage';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { useRef } from 'react';

const AmplifyFileUploader = ({
  onUploadSuccess,
}: {
  onUploadSuccess: (event: { key?: string; fileType?: string }) => void;
}) => {
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

  return (
    <Card className='mt-5'>
      <Toast ref={toast} />
      <FileUploader
        acceptedFileTypes={['image/*']}
        path='uploads/'
        maxFileCount={1}
        isResumable={true}
        showThumbnails={false}
        onUploadSuccess={onUploadSuccess}
        onUploadError={handleUploadError}
      />
    </Card>
  );
};

export default AmplifyFileUploader;
