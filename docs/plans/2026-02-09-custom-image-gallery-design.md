# Custom Image Gallery Design

Date: 2026-02-09
Owner: Codex + User
Status: Draft (validated in brainstorming)

## Goals
- Replace `react-image-gallery` with a custom, responsive, modern, and customizable gallery.
- Keep images and thumbnails sourced from S3 via CloudFront, identical to current behavior.
- Mobile: always full-screen with swipe navigation on touch devices.
- Desktop: hover-only nav controls, fullscreen control, keyboard navigation, autoplay toggle.
- Tablet+: fixed-height, horizontally scrollable thumbnail strip below the main image.
- Components should be single-purpose with small file sizes.
- Preload previous and next images while lazy loading the rest.
- Prepare for eventual extraction to a dedicated module.

## Non-Goals
- No new backend work.
- No changes to S3/CloudFront routing or data models.
- No automatic slideshow start.

## Architecture
Create a small set of focused components under
`src/modules/galleries/components/image-gallery/`:

- `ImageGallery.tsx`
  - Container + state owner (index, fullscreen, autoplay, info toggle).
  - Maps `galleryImages` to internal items with S3 + thumbnail URLs.
  - Handles keyboard navigation and fullscreen API integration.
  - Calls `setSlideIndex` on changes.
- `GalleryViewport.tsx`
  - Renders the main image track with slide transition.
  - Handles touch/pointer swipe logic and hover-state for controls.
- `GalleryControls.tsx`
  - Hover-only desktop controls: prev/next, autoplay toggle, fullscreen.
- `GalleryThumbnails.tsx`
  - Tablet+ fixed-height strip, horizontal scroll, click to select.
- `GalleryCaption.tsx`
  - Toggleable info panel for title/description.
- `useGalleryPreload.ts`
  - Hook to preload previous/next images based on current index.

## UX and Interaction
- Mobile: always full-screen (100vh/100vw). Swipe left/right to navigate.
- Desktop: navigation controls appear on hover; fullscreen button in top-right overlay.
- Keyboard: left/right arrows navigate on desktop.
- Transition: horizontal slide animation between images.
- Captions: toggled with an info icon; overlay at bottom on mobile, below image on desktop.
- Autoplay: user-enabled toggle only.

## Data Flow
Inputs: `galleryImages`, `isLoading`, `setSlideIndex`.

Mapping:
- `original` uses `image.s3Key`.
- `thumbnail` uses `image.s3ThumbnailKey` or falls back to
  `s3Key` with `UPLOADS_PREFIX` -> `THUMBNAIL_PREFIX`.
- URLs are built with `https://${VITE_CLOUDFRONT_DOMAIN}/...`.

## Rendering Strategy
- Use `LazyLoadImage` for main and thumbnail images.
- Preload previous + next images using `new Image()` within `useGalleryPreload`.
- Track for slides renders only prev/current/next for performance.
- `GalleryThumbnails` hidden on mobile via media queries.

## Error Handling and Empty States
- Preserve existing loading/empty UI patterns.
- If an image fails to load, show a minimal fallback in the viewport.

## Testing
- Unit test for `useGalleryPreload` (prev/next preload calls).
- Component test (if test infra exists) for:
  - Thumbnail click updates index
  - Keyboard navigation works

## Implementation Steps
1. Create new components and styles; keep file sizes small.
2. Replace `ReactImageGallery` usage in `ImageGallery.tsx`.
3. Remove `react-image-gallery` CSS import and dependency from `package.json`.
4. Update `src/index.css` to remove the library CSS import.
5. Verify responsive behavior on mobile, tablet, desktop.

## Notes for Future Extraction
- Keep component APIs minimal and pure.
- Avoid cross-module imports except for shared constants.
