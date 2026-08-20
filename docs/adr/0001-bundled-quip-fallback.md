# The home page ships a bundled copy of the quips it also reads from DynamoDB

Quips moved from a hardcoded array to a DynamoDB model so they can be edited
without a deploy. `src/modules/quips/quips.ts` was deliberately **kept** rather
than deleted: the home page hero draws its first quip from that bundled list
synchronously at mount, and falls back to it entirely if the read fails or
returns nothing.

This is not migration leftovers. The hero curtain has no acceptable loading
state — a spinner or an empty panel inside 3rem black display type reads as a
bug, and the whole point of the panel is that the punchline lands the instant
the curtain lifts. The public read also goes through the AppSync API key, which
`amplify/data/resource.ts` sets to expire every 30 days, so "the database is
unreachable" is a live failure mode for an element that previously could not
fail. With the bundled list the page degrades to its old behaviour; without it,
it degrades to a black rectangle.

## Consequences

The twelve starter quips exist in two places and will drift. That is accepted:
the bundled copy is only ever visible when the database cannot be reached, so
being slightly stale is invisible in practice.

**Do not delete `quips.ts` on the grounds that the quips now live in DynamoDB.**
That is the specific mistake this record exists to prevent.
