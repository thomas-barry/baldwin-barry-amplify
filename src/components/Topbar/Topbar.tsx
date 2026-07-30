import AuthButton from '@/components/AuthButton';
import ThemeToggle from '@/components/ThemeToggle';
import { galleryQueryOptions } from '@/modules/galleries/queries';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import styles from './Topbar.module.css';

const SITE_NAME = 'THOMAS BALDWIN BARRY';

/** Keyed by first path segment, so every page in a section shares its crumb
 *  and links back to that section's root. `as const` keeps `to` a literal
 *  route type, which is what Link requires. */
const SECTIONS = {
  photos: { label: 'Photography', to: '/photos' },
  about: { label: 'About', to: '/about' },
  contact: { label: 'Contact', to: '/contact' },
  admin: { label: 'Admin', to: '/admin' },
  'grid-demo': { label: 'Grid Demo', to: '/grid-demo' },
} as const;

type CrumbTo = '/' | (typeof SECTIONS)[keyof typeof SECTIONS]['to'];

interface Crumb {
  label: string;
  /** Omitted for the current page, which renders as plain text. */
  to?: CrumbTo;
}

const Topbar = () => {
  const pathname = useRouterState({ select: s => s.location.pathname });

  // Topbar renders beside <Outlet />, not inside it, so useParams would resolve
  // against the root route and never see galleryId. Read it off the matches.
  const galleryId = useRouterState({
    select: s =>
      s.matches.find(match => match.routeId.includes('$galleryId'))?.params as
        | { galleryId?: string }
        | undefined,
  })?.galleryId;

  const { data: gallery } = useQuery({
    ...galleryQueryOptions(galleryId ?? ''),
    enabled: Boolean(galleryId),
  });

  const crumbs: Crumb[] = [{ label: SITE_NAME, to: '/' }];

  const section = SECTIONS[pathname.split('/')[1] as keyof typeof SECTIONS];
  if (section) {
    crumbs.push({ label: section.label, to: section.to });
  }

  // The gallery view and its image carousel share one route, so a resolved
  // galleryId covers both. Held back until the name loads to avoid showing a
  // placeholder in a sticky header.
  if (galleryId && gallery?.name) {
    crumbs.push({ label: gallery.name });
  }

  return (
    <header className={styles.topbar}>
      <nav className={styles.left} aria-label='Breadcrumb'>
        <ol className={styles.crumbs}>
          {crumbs.map((crumb, index) => {
            const isCurrent = index === crumbs.length - 1;
            const textClass = index === 0 ? styles.siteName : styles.pageTitle;

            return (
              <li className={styles.crumb} key={`${index}-${crumb.label}`}>
                {index > 0 && (
                  <span className={styles.separator} aria-hidden='true'>
                    /
                  </span>
                )}
                {isCurrent || !crumb.to ? (
                  <span className={textClass} aria-current='page'>
                    {crumb.label}
                  </span>
                ) : (
                  // exact matching stops Link auto-applying aria-current="page"
                  // to ancestor crumbs — /photos prefix-matches /photos/$id,
                  // which would leave two crumbs announced as the current page.
                  <Link
                    to={crumb.to}
                    activeOptions={{ exact: true }}
                    className={`${textClass} ${styles.crumbLink}`}
                  >
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className={styles.right}>
        <ThemeToggle />
        <AuthButton />
      </div>
    </header>
  );
};

export default Topbar;
