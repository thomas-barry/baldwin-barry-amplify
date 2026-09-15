import { LinkButton } from '@/components/LinkButton';
import { useAuth } from '@/context/AuthContext';
import { galleryQueryOptions } from '@/modules/galleries/queries';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import PhotoCarousel from '../photo-carousel/PhotoCarousel';
import styles from './Gallery.module.css';

const Gallery = ({ galleryId }: { galleryId: string }) => {
  const { isAdmin, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  // Shared with the Topbar breadcrumb — see galleryQueryOptions. Held until the
  // session loads, since isAdmin decides which query runs.
  const {
    data: view,
    isLoading: isQueryLoading,
    isError,
  } = useQuery({ ...galleryQueryOptions(galleryId, isAdmin), enabled: !isAuthLoading });
  const gallery = view?.gallery;
  const galleryImages = view?.images;
  const isLoading = isAuthLoading || isQueryLoading;

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

  // The server returns nothing for an admin-only gallery, and an empty one has
  // nothing to show, so both send a visitor back to the list. Wait for auth to
  // settle first — isAdmin is false while the session is still loading, which
  // would bounce an admin off their own empty gallery. A failed query also looks
  // empty, so redirecting on it would turn a network hiccup into a bounce.
  const isHiddenFromVisitors = !isAdmin && !isLoading && !isError && !galleryImages?.length;

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
          <h2 className={styles.galleryHeading}>{isLoading ? 'Loading…' : (gallery?.name ?? 'Gallery')}</h2>
          {gallery?.description && <p className={styles.galleryDescription}>{gallery.description}</p>}
        </div>
        <LinkButton
          to='/photos'
          className={styles.backLink}
          icon='arrow-left'
          label='Galleries'
          severity='secondary'
          aria-label='Back to galleries'
        />
        {isAdmin && (
          <LinkButton
            to='/photos/$galleryId/edit'
            params={{ galleryId }}
            className={styles.editLink}
            icon='pencil'
            severity='info'
            aria-label='Edit Gallery'
          />
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
