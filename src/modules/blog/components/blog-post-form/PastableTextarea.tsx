import { createImageUploadMetadata } from '@/lib/s3-metadata-utils';
import { uploadData } from 'aws-amplify/storage';
import { InputTextarea, type InputTextareaProps } from 'primereact/inputtextarea';
import { useRef, useState } from 'react';
import { UPLOADS_PREFIX } from '../../../../../constants';
import styles from './PastableTextarea.module.css';

/** 25 MB — a generous ceiling for a web-bound photo, low enough to catch an
 *  accidental paste of something huge before it ties up the upload. */
const MAX_BYTES = 25 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

type NotifySeverity = 'success' | 'info' | 'warn' | 'error';

interface PastableTextareaProps extends Omit<InputTextareaProps, 'value' | 'onChange'> {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  /** Called with the bare S3 key once an image finishes uploading, so the form
   *  can track keys to clean up if the draft is later discarded. */
  onImageUploaded: (key: string) => void;
  notify: (severity: NotifySeverity, summary: string, detail: string) => void;
}

interface UploadJob {
  file: File;
  safeName: string;
  token: string;
  key: string;
}

const buildJob = (file: File): UploadJob => {
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ext = EXT_BY_TYPE[file.type] ?? file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeName = base && base !== 'image' ? `${base}.${ext}` : `pasted-${uploadId}.${ext}`;
  return {
    file,
    safeName,
    token: `![uploading ${safeName}…](uploading:${uploadId})`,
    key: `${UPLOADS_PREFIX}${uploadId}-${safeName}`,
  };
};

/**
 * The musing body editor, with paste and drag-and-drop image upload layered on
 * top of PrimeReact's textarea. A dropped or pasted image is uploaded to the
 * same `uploads/` prefix the gallery uploader uses — the `onUploadHandler`
 * Lambda then indexes it and builds a thumbnail — and a `![](key)` reference is
 * left in the markdown. While the upload runs, a placeholder token holds the
 * spot so typing elsewhere can't misplace the image.
 */
const PastableTextarea = ({ value, setValue, onImageUploaded, notify, ...textareaProps }: PastableTextareaProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const runUpload = async (job: UploadJob) => {
    try {
      await uploadData({
        path: job.key,
        data: job.file,
        options: {
          contentType: job.file.type,
          metadata: createImageUploadMetadata({ fileName: job.safeName, s3Key: job.key }),
        },
      }).result;
      setValue(prev => prev.replace(job.token, `![](${job.key})`));
      onImageUploaded(job.key);
    } catch (error) {
      console.error('Pasted image upload failed:', error);
      setValue(prev => prev.replace(job.token, '').replace(/\n{3,}/g, '\n\n'));
      notify('error', 'Upload failed', `Could not upload ${job.safeName}.`);
    }
  };

  /** Returns true when it consumed image files (so the caller suppresses the
   *  browser's default paste/drop of that content). */
  const handleFiles = (files: File[]): boolean => {
    const images = files.filter(file => file.type.startsWith('image/'));
    if (images.length === 0) return false;

    const withinLimit: File[] = [];
    for (const file of images) {
      if (file.size > MAX_BYTES) {
        notify('warn', 'Image too large', `${file.name || 'That image'} is over 25 MB and was skipped.`);
      } else {
        withinLimit.push(file);
      }
    }
    if (withinLimit.length === 0) return true;

    const jobs = withinLimit.map(buildJob);
    // Blank line between each image and around the block — a single newline
    // leaves them in the surrounding paragraph and markdown renders them inline.
    const block = jobs.map(job => job.token).join('\n\n');

    // Read the caret now, synchronously: by the time a setState updater runs the
    // textarea selection may already have collapsed to 0.
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const lead = before.length === 0 || /\n\n$/.test(before) ? '' : /\n$/.test(before) ? '\n' : '\n\n';
    const trail = after.length === 0 ? '\n' : /^\n\n/.test(after) ? '' : /^\n/.test(after) ? '\n' : '\n\n';
    setValue(`${before}${lead}${block}${trail}${after}`);

    for (const job of jobs) void runUpload(job);
    return true;
  };

  const handlePaste: React.ClipboardEventHandler<HTMLTextAreaElement> = event => {
    const files = Array.from(event.clipboardData.files);
    if (handleFiles(files)) event.preventDefault();
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = event => {
    if (Array.from(event.dataTransfer.items).some(item => item.kind === 'file')) {
      event.preventDefault();
      setIsDragging(true);
    }
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
  };

  const handleDrop: React.DragEventHandler<HTMLDivElement> = event => {
    const files = Array.from(event.dataTransfer.files);
    if (files.some(file => file.type.startsWith('image/'))) {
      event.preventDefault();
      handleFiles(files);
    }
    setIsDragging(false);
  };

  return (
    <div
      className={styles.wrap}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}>
      <InputTextarea
        {...textareaProps}
        ref={ref}
        value={value}
        onChange={event => setValue(event.target.value)}
        onPaste={handlePaste}
      />
      {isDragging && <div className={styles.overlay}>Drop image to upload</div>}
    </div>
  );
};

export default PastableTextarea;
