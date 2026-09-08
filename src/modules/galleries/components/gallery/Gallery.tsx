import { useAuth } from '@/context/AuthContext';
import { galleryQueryOptions } from '@/modules/galleries/queries';
import type { Schema } from '@/schema';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { generateClient } from 'aws-amplify/data';
import { useEffect, useState } from 'react';
import PhotoCarousel from '../photo-carousel/PhotoCarousel';
import styles from './Gallery.module.css';

const clientApiKey = generateClient<Schema>({ authMode: 'apiKey' });

const Gallery = ({ galleryId }: { galleryId: string }) => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  const {
    data: galleryImages,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['galleryImages', galleryId],
    queryFn: async () => {
      const response = await clientApiKey.models.GalleryImage.list({
        filter: { galleryId: { eq: galleryId } },
        selectionSet: ['id', 'galleryId', 'imageId', 'addedDate', 'order', 'image.*'],
      });

      return response.data?.sort((a, b) => {
        if (a.order === null && b.order === null) return 0;
        if (a.order === null) return 1;
        if (b.order === null) return -1;
        if (a.order !== b.order) return a.order - b.order;
        return new Date(a.addedDate).getTime() - new Date(b.addedDate).getTime();
      });
    },
  });

  // Shared with the Topbar breadcrumb — see galleryQueryOptions.
  const { data: gallery, isLoading: isGalleryLoading } = useQuery(galleryQueryOptions(galleryId));

  // Tapping the photo drops every control so the image is unobstructed; the
  // carousel owns the gesture, this owns the state, because the floating header
  // below has to fade with it.
  const [chromeVisible, setChromeVisible] = useState(true);

  // The immersive layout is full-bleed, so the fixed mobile top bar and the
  // space .mainContent reserves for it have to go while this route is mounted.
  // A body class rather than a prop: both of those live in components this route
  // does not own. Declared above the early return below so the hook order is
  // stable, and cleaned up on unmount or the top bar stays hidden on /photos.
  useEffect(() => {
    document.body.classList.add('immersive-gallery');
    return () => document.body.classList.remove('immersive-gallery');
  }, []);

  // A direct link would otherwise expose what the gallery list hides. Wait for
  // auth to settle first — isAdmin is false while the session is still loading,
  // which would bounce an admin off their own empty gallery. A failed query also
  // looks empty, so redirecting on it would turn a network hiccup into a bounce.
  const isHiddenFromVisitors =
    !isAdmin &&
    !isAuthLoading &&
    !isGalleryLoading &&
    !isLoading &&
    !isError &&
    (!!gallery?.adminOnly || !galleryImages?.length);

  useEffect(() => {
    if (isHiddenFromVisitors) {
      navigate({ to: '/photos', replace: true });
    }
  }, [isHiddenFromVisitors, navigate]);

  if (isHiddenFromVisitors) return null;

  return (
    <div className={styles.galleryStage}>
      {/* Flat rather than nested in an actions wrapper: the back link sits after
          the title on a desktop and before it on a phone, and one flex container
          with `order` gets both from a single set of markup. */}
      <div className={`${styles.galleryHeader} ${chromeVisible ? '' : styles.chromeHidden}`}>
        <div className={styles.galleryTitleBlock}>
          <h2 className={styles.galleryHeading}>{isGalleryLoading ? 'Loading…' : (gallery?.name ?? 'Gallery')}</h2>
          {gallery?.description && <p className={styles.galleryDescription}>{gallery.description}</p>}
        </div>
        <Link
          to='/photos'
          className={`${styles.backLink} p-button p-component p-button-secondary`}
          aria-label='Back to galleries'>
          <span
            className='p-button-icon pi pi-arrow-left p-button-icon-left'
            aria-hidden='true'
          />
          <span className='p-button-label'>Galleries</span>
        </Link>
        {isAdmin && (
          <Link
            to='/photos/$galleryId/edit'
            params={{ galleryId }}
            className={`${styles.editLink} p-button p-component p-button-info`}
            aria-label='Edit Gallery'>
            <span
              className='p-button-icon pi pi-pencil'
              aria-hidden='true'
            />
          </Link>
        )}
      </div>

      <PhotoCarousel
        galleryImages={galleryImages ?? []}
        isLoading={isLoading}
        chromeVisible={chromeVisible}
        onToggleChrome={() => setChromeVisible(visible => !visible)}
      />
    </div>
  );
};

export default Gallery;
