import { generateClient } from 'aws-amplify/data';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import { useRef, useState } from 'react';
import type { Schema } from '../../../../../amplify/data/resource';
import { Gallery } from '../../types';
import styles from './GalleryForm.module.css';

interface GalleryFormProps {
  visible: boolean;
  onHide: () => void;
  onSave: (gallery: Gallery) => void;
  initialValues?: Partial<Gallery>;
  isEdit?: boolean;
}

const GalleryForm = ({ visible, onHide, onSave, initialValues, isEdit = false }: GalleryFormProps) => {
  const [name, setName] = useState<string>(initialValues?.name || '');
  const [description, setDescription] = useState<string>(initialValues?.description || '');
  const [createdDate, setCreatedDate] = useState<Date>(
    initialValues?.createdDate ? new Date(initialValues.createdDate) : new Date(),
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string>('');
  const toast = useRef<Toast>(null);

  // Generate the client for our Amplify data models
  const client = generateClient<Schema>();

  const resetForm = () => {
    setName(initialValues?.name || '');
    setDescription(initialValues?.description || '');
    setCreatedDate(initialValues?.createdDate ? new Date(initialValues.createdDate) : new Date());
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

      const galleryData = {
        name: name.trim(),
        description: description.trim() || null,
        createdDate: createdDate.toISOString(),
      };

      let result;

      if (isEdit && initialValues?.id) {
        // Update existing gallery
        result = await client.models.Gallery.update({
          id: initialValues.id,
          ...galleryData,
        });
      } else {
        // Create new gallery
        result = await client.models.Gallery.create(galleryData);
      }

      if (result.data) {
        // Extract gallery data from the result
        const savedGallery: Gallery = {
          id: result.data.id,
          name: result.data.name,
          description: result.data.description,
          createdDate: result.data.createdDate,
        };

        toast.current?.show({
          severity: 'success',
          summary: isEdit ? 'Gallery Updated' : 'Gallery Created',
          detail: isEdit ? 'Gallery has been updated successfully' : 'New gallery has been created',
          life: 3000,
        });

        onSave(savedGallery);
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
        header={isEdit ? 'Edit Gallery' : 'Create New Gallery'}
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
            <label
              htmlFor='description'
              className={styles.formLabel}>
              Description
            </label>
            <InputTextarea
              id='description'
              value={description}
              onChange={e => setDescription(e.target.value)}
              className='w-full'
              rows={5}
              placeholder='Enter gallery description (optional)'
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default GalleryForm;
