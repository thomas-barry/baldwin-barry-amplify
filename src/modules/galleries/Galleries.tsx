import GalleryList from '@/components/GalleryList';
import type { SortValue } from '@/components/SortSelect';
import SortSelect from '@/components/SortSelect';
import { useAuth } from '@/context/AuthContext';
import { Button } from 'primereact/button';
import { useState } from 'react';
import GalleryForm from './components/gallery-form/GalleryForm';
import styles from './Galleries.module.css';
import { useGalleryForm } from './hooks/useGalleryForm';

const Galleries = () => {
  const { isAdmin } = useAuth();
  const { isOpen, editGallery, openCreateForm, closeForm } = useGalleryForm();
  const [sort, setSort] = useState<SortValue>('newest');

  return (
    <div className={styles.page}>
      <div className={styles.pageHeaderRow}>
        <div>
          <h1 className={styles.pageHeading}>Photography</h1>
        </div>
        <div className={styles.headerControls}>
          <SortSelect
            value={sort}
            onChange={setSort}
          />
          {isAdmin && (
            <Button
              label='New Gallery'
              icon='pi pi-plus'
              onClick={openCreateForm}
            />
          )}
        </div>
      </div>

      {isAdmin && (
        <div className={styles.galleryAdmin}>
          <GalleryForm
            visible={isOpen}
            onHide={closeForm}
            initialValues={editGallery || undefined}
            isEdit={!!editGallery}
          />
        </div>
      )}

      <div className={styles.listWrapper}>
        <GalleryList sort={sort} />
      </div>
    </div>
  );
};

export default Galleries;
