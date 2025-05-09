import { Card } from 'primereact/card';
import { FileUpload } from 'primereact/fileupload';
import uploadFile from '../lib/s3/upload-file';

const EmptyTemplate = () => {
  return <p className='m-0 text-center'>Drag and drop files here</p>;
};

const S3FileUploader = () => {
  return (
    <Card className='mt-5'>
      <FileUpload
        accept='image/*'
        multiple
        customUpload
        uploadHandler={uploadFile}
        emptyTemplate={<EmptyTemplate />}
      />
    </Card>
  );
};

export default S3FileUploader;
