import GalleryList from '@/components/GalleryList';
import { useAuth } from '@/context/AuthContext';
import { Button } from 'primereact/button';
import GalleryForm from './components/gallery-form/GalleryForm';
import styles from './Galleries.module.css';
import { useGalleryForm } from './hooks/useGalleryForm';
import { Gallery } from './types';

const handleSave = (gallery: Gallery) => {
  console.log('gallery saved:', gallery);
};

const Galleries = () => {
  const { isAdmin } = useAuth();
  const { isOpen, editGallery, openCreateForm, closeForm } = useGalleryForm();
  return (
    <>
      {isAdmin && (
        <div className={styles.galleryAdmin}>
          <GalleryForm
            visible={isOpen}
            onHide={closeForm}
            onSave={handleSave}
            initialValues={editGallery || undefined}
            isEdit={!!editGallery}
          />
          <Button
            label='Create New Gallery'
            icon='pi pi-plus'
            onClick={openCreateForm}
          />
        </div>
      )}
      <GalleryList />
    </>
  );
};

export default Galleries;
