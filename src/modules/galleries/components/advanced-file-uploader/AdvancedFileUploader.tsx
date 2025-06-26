import { FileUploader } from '@aws-amplify/ui-react-storage';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { useRef, useState } from 'react';

interface AdvancedFileUploaderProps {
  onUploadSuccess: (event: { key?: string; fileType?: string }) => void;
  galleryId: string;
}

const AdvancedFileUploader = ({ onUploadSuccess, galleryId }: AdvancedFileUploaderProps) => {
  const toast = useRef<Toast>(null);
  const [imageTitle, setImageTitle] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadError = (error: string) => {
    console.error('upload error:', error);
    toast.current?.show({
      severity: 'error',
      summary: 'upload failed',
      detail: error || 'failed to upload image',
      life: 5000,
    });
    setIsUploading(false);
  };

  const handleUploadSuccess = (event: { key?: string; fileType?: string }) => {
    setIsUploading(false);
    setImageTitle('');
    setImageDescription('');
    onUploadSuccess(event);
  };

  const handleUploadStart = () => {
    setIsUploading(true);
  };

  // Process file to add metadata before upload
  const processFile = ({ file, key }: { file: File; key: string }) => {
    const metadata: Record<string, string> = {
      galleryid: galleryId,
      uploadtimestamp: new Date().toISOString(),
      originalfilename: file.name,
    };

    // Add user-provided metadata
    if (imageTitle.trim()) {
      metadata.title = imageTitle.trim();
    }

    if (imageDescription.trim()) {
      metadata.description = imageDescription.trim();
    }

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
      <div style={{ marginBottom: '20px' }}>
        <h4>Upload Image with Metadata</h4>

        <div style={{ marginBottom: '15px' }}>
          <label
            htmlFor='imageTitle'
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Image Title:
          </label>
          <InputText
            id='imageTitle'
            value={imageTitle}
            onChange={e => setImageTitle(e.target.value)}
            placeholder='Enter image title'
            style={{ width: '100%' }}
            disabled={isUploading}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label
            htmlFor='imageDescription'
            style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Image Description:
          </label>
          <InputTextarea
            id='imageDescription'
            value={imageDescription}
            onChange={e => setImageDescription(e.target.value)}
            placeholder='Enter image description'
            rows={3}
            style={{ width: '100%' }}
            disabled={isUploading}
          />
        </div>
      </div>

      <FileUploader
        acceptedFileTypes={['image/*']}
        path='uploads/'
        maxFileCount={1}
        isResumable={true}
        showThumbnails={true}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
        onUploadStart={handleUploadStart}
        processFile={processFile}
        autoUpload={true}
      />

      {isUploading && (
        <div style={{ marginTop: '10px', textAlign: 'center' }}>
          <i
            className='pi pi-spin pi-spinner'
            style={{ fontSize: '1.5rem' }}></i>
          <p>Uploading with metadata...</p>
        </div>
      )}
    </Card>
  );
};

export default AdvancedFileUploader;
