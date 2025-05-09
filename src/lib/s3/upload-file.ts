import { FileUploadHandlerEvent } from 'primereact/fileupload';
import axios, { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import getUploadUrlCall from '../function-calls/get-upload-url-call';

const uploadFileToS3 = async (event: FileUploadHandlerEvent) => {
  const file = event.files[0];

  const fileName = file.name;
  console.log('file name:', fileName);

  const { uploadUrl } = await getUploadUrlCall(file);
  console.log('uploadUrl:', uploadUrl);

  const options: AxiosRequestConfig = {
    headers: {
      'Content-Type': file.type,
    },
    onUploadProgress: (progressEvent: AxiosProgressEvent) => {
      console.log('total: ', progressEvent.total);
      const { loaded, total } = progressEvent;
      if (total) {
        const percentComplete = (loaded / total) * 100;
        console.log(`upload progress: ${percentComplete.toFixed(2)}% (${loaded} of ${total} bytes)`);
      }
    },
  };

  const uploadResponse = await axios.put(uploadUrl, file, options);
};

export default uploadFileToS3;
