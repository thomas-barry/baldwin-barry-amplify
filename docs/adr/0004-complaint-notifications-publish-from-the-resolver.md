# Complaint notifications publish to SNS from the resolver, not from a Lambda

The site owner is emailed when a complaint is submitted. The obvious build — a
DynamoDB stream on the Complaint table triggering a Lambda that calls SNS — needs
`@aws-sdk/client-sns`, and Amplify's function bundler inlines the SDK rather than
using the runtime's copy. Adding any dependency here means editing a lockfile
that `npm ci` has already rejected once (the PR #22 revert), and the only safe
gate is a full `rm -rf node_modules && npm ci`. Instead, `submitComplaint` is a
two-step AppSync pipeline: the existing DynamoDB write, then
`notifyComplaint.js`, which publishes over a SigV4-signed HTTP data source. The
topic ARN reaches that verbatim-uploaded file through the API's environment
variables (`ctx.env`). EventBridge Pipes was also considered; it needs no code
but cannot map a reading to its word ("8/11 · Fuming").

## Consequences

The notification is synchronous with the submission, and deliberately cannot
fail it: a publish error is logged, never returned, because the form treats any
GraphQL error as a failed submission and would invite a duplicate. So a broken
subscription fails silently; the admin badge is the backstop.

The honeypot's `runtime.earlyReturn` only leaves the first step. The submit step
sets `ctx.stash.skipNotify` for that reason — **remove it and every bot emails
you.**

The recipient comes from `COMPLAINT_NOTIFY_EMAIL` at synth time and is never
committed. The email carries the nickname and reading only, not the complaint
text (see docs/adr/0002).
