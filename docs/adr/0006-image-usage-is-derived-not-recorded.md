# What an image is used for is derived, never recorded

Nothing in the schema says what an image was uploaded for. `createUploadKey`
gives gallery uploads and images pasted into a musing the same `uploads/`
prefix, and `onUploadHandler` makes an `Image` row for both, so "uploaded for a
musing" is not a category the data has. The admin image library therefore
*derives* usage: it reads every `Image`, `GalleryImage`, `Gallery` and
`BlogPost` row, runs each musing's content through `extractImageKeys`, and
diffs the two sets to find orphans — images in no gallery, thumbnail for no
gallery, and named by no musing, draft or published.

**Both sides must be normalised through `toServedKey` before the diff**: `Image.s3Key` is an `uploads/` key, musing
markdown holds `uploads/` for old posts and `display/` for new ones, and
`extractImageKeys` already maps what it returns. Diff the raw strings and every
image reads as an orphan — which is a delete button aimed at the whole
library.

Recording usage instead — a `source` or `usedIn` field on `Image` — was
rejected twice over. It is unknowable for every row that already exists, and it
goes stale the moment someone edits a musing's markdown, which is exactly the
moment the answer changes. A derived answer cannot be wrong; a recorded one
silently can, and this one gates a delete button.

## Consequences

The whole library is scanned in the browser on every visit to the page. At 69
images, 63 memberships and 2 musings that is trivial, and `ImagePicker`
already does the same walk. **The decision is conditional on staying small:**
`listAll` caps at `MAX_IMAGES = 500` and truncates silently past it, and a
truncated scan reports images as orphans that are not. Crossing that ceiling
invalidates this ADR — move the diff to a resolver or Lambda rather than
raising the cap, because a client-side scan that silently truncates is a
delete button pointed at the wrong rows.

Rows can already be out of step with their bytes. `BlogPostForm`'s
`discardDraft` removes the pasted `uploads/` object but leaves the `Image` row
and the `thumbnails/`/`display/` copies `onUploadHandler` built from it, so an
abandoned draft can leave a row whose thumbnail still renders and whose
original is gone. Those rows show up as orphans, which is correct — deleting
them is the cleanup.

Derivation also yields broken references for free — a musing naming a key no
`Image` row owns — which the page reports read-only. Objects under `uploads/`
with no `Image` row at all are deliberately out of scope: the bucket is
versioned and uploads are in flight, so sweeping it is a different job with a
different failure mode.
