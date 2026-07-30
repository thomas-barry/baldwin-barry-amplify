import ImageSquareSelector, { SquareSelection } from '@/components/ImageSquareSelector';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useEffect, useState } from 'react';
import styles from './ThumbnailCropDialog.module.css';

interface ThumbnailCropDialogProps {
  onHide: () => void;
  imageUrl: string;
  imageTitle: string;
  initialCrop: SquareSelection | null;
  onSave: (crop: SquareSelection | null) => void;
  isSaving: boolean;
}

const ThumbnailCropDialog = ({
  onHide,
  imageUrl,
  imageTitle,
  initialCrop,
  onSave,
  isSaving,
}: ThumbnailCropDialogProps) => {
  const [selection, setSelection] = useState<SquareSelection | null>(initialCrop);

  useEffect(() => {
    setSelection(initialCrop);
  }, [initialCrop]);

  const footer = (
    <div className={styles.footer}>
      <Button
        label='Cancel'
        severity='secondary'
        text
        onClick={onHide}
        disabled={isSaving}
      />
      <Button
        label='Save as Thumbnail'
        icon={isSaving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
        disabled={!selection || isSaving}
        onClick={() => onSave(selection)}
      />
    </div>
  );

  return (
    <Dialog
      visible
      onHide={onHide}
      header={`Crop thumbnail — ${imageTitle}`}
      footer={footer}
      style={{ width: '700px' }}
      modal
      dismissableMask>
      <div className={styles.body}>
        <ImageSquareSelector
          imageUrl={imageUrl}
          selection={selection}
          onSelectionChange={setSelection}
        />
      </div>
    </Dialog>
  );
};

export default ThumbnailCropDialog;
