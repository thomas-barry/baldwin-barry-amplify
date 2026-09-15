# Complaints are hidden until an admin approves them

The complaints page is the first place on the site where an unauthenticated
visitor can write data, and the AppSync API key that permits it ships in every
browser — so anything checked client-side can be bypassed with a direct
GraphQL call. We chose pre-moderation (a new complaint is invisible until an
admin approves it) over post-moderation or none. The page rule is that we
capture no personal information, but that rule cannot stop a complainant from
publishing someone *else's* name, number or address, nor stop link spam; only
keeping unapproved text off the public page does. Pre-moderation also means
spam costs admin time rather than public embarrassment, which is why a paid
WAF rate limit was deferred rather than adopted.

## Consequences

The wall lags reality by however long approval takes. "Not public" must hold
at the API, not just in the UI: a public read path that can return unapproved
complaints defeats this decision even if the page filters them out.
