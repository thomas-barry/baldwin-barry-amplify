# Visitors read galleries and musings through custom operations, never the models

`Gallery`, `Image`, `GalleryImage` and `BlogPost` are admin-only. Visitors get
four public API-key queries instead: `listPublicGalleries` and
`getPublicGallery` (one Lambda, `amplify/functions/publicGalleries`), and
`listPublishedBlogPosts` and `getPublishedBlogPost` (AppSync JS resolvers in
`amplify/data/blog/`). API-key auth has no row-level filter, so public model
`read` let anyone holding the key from the bundle list draft musings,
admin-only galleries and every image record — including images in no public
gallery — by dropping the page's filter. The pages hid them; the API did not.

The galleries use a Lambda rather than JS resolvers because a visitor's view
joins three tables (gallery, memberships, images), skips admin-only and empty
galleries, and must page through all of them — a pipeline of single DynamoDB
calls cannot loop. The musings are one table with one filter, which a single
DynamoDB call per resolver handles. Field-level auth on the models was
rejected: it can hide a field but not a row, which is the actual problem.

## Consequences

The public payloads are custom types mapped field by field, so they cannot
carry `published`, `adminOnly`, file names, sizes or tags, and EXIF appears
only on gallery photos. A draft or admin-only gallery reads as null — the same
as one that does not exist.

Admins read the models through the user pool, so every query that serves both
an admin and a visitor takes `isAdmin` and caches per audience
(`galleryQueryOptions`, `blogPostQueryOptions`, and the list options). Pages
hold those queries until the session has loaded, since `isAdmin` is false until
then. Admin-only screens (gallery editor, image picker, photo upload) read with
the user pool client.

`Quip` stays publicly readable: it has no hidden rows.

**Do not put `allow.publicApiKey().to(['read'])` back on these models**, even
to "simplify" a new page. Add a field to the public type and its mapping
instead.
