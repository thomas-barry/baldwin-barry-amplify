import type { Schema } from '@/schema';
import { useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { useRef, useState } from 'react';
import { Gallery } from '../../types';
import styles from './GalleryForm.module.css';

const client = generateClient<Schema>({ authMode: 'userPool' });

interface GalleryFormProps {
  visible: boolean;
  onHide: () => void;
  onSave?: (gallery: Gallery) => void;
  initialValues?: Partial<Gallery>;
  isEdit?: boolean;
}

const GalleryForm = ({ visible, onHide, onSave, initialValues, isEdit = false }: GalleryFormProps) => {
  const [name, setName] = useState<string>(initialValues?.name || '');
  const [adminOnly, setAdminOnly] = useState<boolean>(initialValues?.adminOnly ?? false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string>('');
  const toast = useRef<Toast>(null);
  const queryClient = useQueryClient();

  const resetForm = () => {
    setName(initialValues?.name || '');
    setAdminOnly(initialValues?.adminOnly ?? false);
    setNameError('');
  };

  const handleHide = () => {
    resetForm();
    onHide();
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError('Gallery name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      let result;

      if (isEdit && initialValues?.id) {
        result = await client.models.Gallery.update({
          id: initialValues.id,
          name: name.trim(),
          adminOnly,
        });
      } else {
        result = await client.models.Gallery.create({
          name: name.trim(),
          createdDate: new Date().toISOString(),
          adminOnly,
        });
      }

      if (result.data) {
        // Extract gallery data from the result
        const savedGallery: Gallery = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          createdDate: result.data.createdDate,
          adminOnly: result.data.adminOnly,
        };

        toast.current?.show({
          severity: 'success',
          summary: isEdit ? 'Gallery Updated' : 'Gallery Created',
          detail: isEdit ? 'Gallery has been updated successfully' : 'New gallery has been created',
          life: 3000,
        });

        // Refresh the galleries list
        queryClient.invalidateQueries({ queryKey: ['galleries'] });

        onSave?.(savedGallery);
        handleHide();
      }
    } catch (error) {
      console.error('Error saving gallery:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: error instanceof Error ? error.message : 'An unexpected error occurred',
        life: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogFooter = (
    <div className={styles.dialogFooter}>
      <Button
        label='Cancel'
        icon='pi pi-times'
        outlined
        onClick={handleHide}
        className='p-button-text'
      />
      <Button
        label={isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
        icon='pi pi-check'
        onClick={handleSubmit}
        disabled={isSubmitting}
        loading={isSubmitting}
      />
    </div>
  );

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header={isEdit ? 'Edit Gallery' : 'New Gallery'}
        visible={visible}
        style={{ width: '500px' }}
        modal
        onHide={handleHide}
        footer={dialogFooter}
        draggable={false}
        resizable={false}>
        <div className={styles.formContainer}>
          <div className={styles.formField}>
            <label
              htmlFor='name'
              className={styles.formLabel}>
              Name <span className={styles.requiredMark}>*</span>
            </label>
            <InputText
              id='name'
              value={name}
              onChange={e => setName(e.target.value)}
              className={nameError ? 'p-invalid w-full' : 'w-full'}
              placeholder='Enter gallery name'
            />
            {nameError && <small className='p-error'>{nameError}</small>}
          </div>
          <div className={styles.formField}>
            <div className={styles.checkboxRow}>
              <Checkbox
                inputId='adminOnly'
                checked={adminOnly}
                onChange={e => setAdminOnly(e.checked ?? false)}
              />
              <label
                htmlFor='adminOnly'
                className={styles.formLabel}>
                Admin only
              </label>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default GalleryForm;
