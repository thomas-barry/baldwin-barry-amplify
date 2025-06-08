import { FileUploader } from '@aws-amplify/ui-react-storage';
import { Card } from 'primereact/card';
import { Toast } from 'primereact/toast';
import { useEffect, useRef, useState } from 'react';

const AmplifyFileUploader = () => {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    console.log('Uploaded files:', uploadedFiles);
  }, [uploadedFiles]);

  const handleUploadSuccess = (event: { key?: string }) => {
    setUploadedFiles(files => [...files, event.key || 'unknown']);
    toast.current?.show({
      severity: 'success',
      summary: 'Upload Complete',
      detail: 'Image uploaded successfully',
      life: 3000,
    });
  };

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
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
      />
    </Card>
  );
};

export default AmplifyFileUploader;
