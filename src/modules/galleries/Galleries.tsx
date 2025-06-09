import GalleryList from '@/components/GalleryList';
import { useAuth } from '@/context/AuthContext';
import { Button } from 'primereact/button';
import GalleryForm from './components/gallery-form/GalleryForm';
import { useGalleryForm } from './hooks/useGalleryForm';
import { Gallery } from './types';

const handleSave = (gallery: Gallery) => {
  // Handle the saved gallery (e.g., update state, refresh list)
  console.log('Gallery saved:', gallery);
};

const Galleries = () => {
  const { isAdmin } = useAuth();
  const { isOpen, editGallery, openCreateForm, closeForm } = useGalleryForm();
  return (
    <>
      <GalleryList />
      <GalleryForm
        visible={isOpen}
        onHide={closeForm}
        onSave={handleSave}
        initialValues={editGallery || undefined}
        isEdit={!!editGallery}
      />
      {isAdmin && (
        <Button
          label='Create New Gallery'
          icon='pi pi-plus'
          onClick={openCreateForm}
        />
      )}
    </>
  );
};

export default Galleries;
