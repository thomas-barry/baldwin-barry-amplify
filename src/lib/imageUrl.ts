import { useQuery } from '@tanstack/react-query';
import { getUrl } from 'aws-amplify/storage';
import { useMemo } from 'react';
import { CLOUDFRONT_DOMAIN, cfUrl } from './cloudfront';

/**
 * Resolves S3 keys to displayable image URLs.
 *
 * In production `CLOUDFRONT_DOMAIN` is always set (an app-level environment
 * variable in the Amplify Console), so keys map straight to CDN URLs with no
 * async work — the same behaviour this app has always had.
 *
 * A local `npx ampx sandbox` writes to its own bucket, which the production
 * CloudFront distribution does not serve. Pointing a sandbox at that CDN
 * yields 403s for every sandbox upload. So when no CDN domain is configured we
 * fall back to presigned S3 URLs straight from the sandbox bucket.
 */

/** True in production and in any sandbox started with CLOUDFRONT_DOMAIN set. */
export const hasCdn = Boolean(CLOUDFRONT_DOMAIN);

/** Presigned URL lifetime. Refreshed well before expiry via `staleTime`. */
const SIGNED_URL_TTL_SECONDS = 3600;
const SIGNED_URL_REFRESH_MS = 45 * 60 * 1000;

/**
 * Appends a cache-busting version to a CDN URL.
 *
 * No-ops on presigned URLs: they already carry a SigV4 query string, and any
 * extra query parameter is included in S3's canonical request, which
 * invalidates the signature and produces a 403. Presigned URLs are
 * self-busting anyway — the signature changes each time they are minted.
 */
export function withCacheBuster(url: string | undefined, version?: string | null): string | undefined {
  if (!url || !version || url.includes('?')) return url;
  return `${url}?v=${version}`;
}

/**
 * Batched because the callers that need this — react-image-gallery's
 * `renderItem` / `renderThumbInner` — are plain callbacks, not components, so a
 * per-image hook is not an option. Pass a memoised array; look results up
 * synchronously by key.
 */
export function useImageUrls(keys: string[]): Record<string, string> {
  const query = useQuery({
    queryKey: ['imageUrls', keys],
    // Never runs in production: the CDN path below is synchronous, and routing
    // it through useQuery would blank `src` on first render.
    enabled: !hasCdn && keys.length > 0,
    staleTime: SIGNED_URL_REFRESH_MS,
    queryFn: async () => {
      const entries = await Promise.all(
        keys.map(async key => {
          const { url } = await getUrl({ path: key, options: { expiresIn: SIGNED_URL_TTL_SECONDS } });
          return [key, url.toString()] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  const cdnUrls = useMemo(
    () => (hasCdn ? Object.fromEntries(keys.map(key => [key, cfUrl(key)])) : {}),
    [keys],
  );

  return hasCdn ? cdnUrls : (query.data ?? {});
}
