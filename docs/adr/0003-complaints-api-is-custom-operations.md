# Complainants reach complaints only through two custom operations, never the model

The `Complaint` model is admin-only. Complainants get exactly two public
API-key operations, each an AppSync JS resolver: `submitComplaint` and
`listApprovedComplaints`. Every other model here grants `publicApiKey` read on
the model itself, so this looks inconsistent — it is deliberate. API-key auth
has no row-level filter, so public model `read` would let anyone list pending
complaints by omitting the page's filter, and public model `create` would let a
caller set `approved: true` and skip moderation. Either defeats ADR 0002 at the
API even if the page behaves. Gen 2 models also cannot enforce string length,
so validation needs a resolver anyway. The alternative — a separate
`PendingComplaint` model copied into a public one on approval — was rejected
as two tables and a copy step for the same guarantee.

## Consequences

`submitComplaint` owns the rules: it validates lengths and the dissatisfaction
range, forces the pending state and stamps the submission time server-side.
`listApprovedComplaints` reads a status + submission-time index, which is also
what gives newest-first paging without a scan.

**Do not "simplify" this into `allow.publicApiKey().to(['create', 'read'])` on
the model.** That is the specific mistake this record exists to prevent.
