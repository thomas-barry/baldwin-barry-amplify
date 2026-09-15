# Context

Glossary of domain terms for this project. Terms only — no implementation detail,
no decisions, no notes. Add a term when its meaning has been settled.

## Curtain

The front panel of a `CurtainCard`. At rest it covers the card; when the card is
revealed the curtain slides away to expose the back.

## Quip

One short line written for the home page curtain. A quip is either enabled or
disabled; only enabled quips are eligible for display.

## Rotation

The set of enabled quips the home page draws from. Every quip in the rotation is
shown once before any is repeated.

## Complaint

One grievance submitted anonymously through the complaints page. Every complaint
is either pending or approved; only approved complaints are shown publicly.
_Avoid_: Grievance, feedback, review, post

## Complainant

The anonymous visitor who submits a complaint. A complainant has no account and
no identity beyond an optional nickname.
_Avoid_: User, guest, customer

## Nickname

The optional display name a complainant attaches to a complaint. A complaint
without one is attributed to "Anonymous".
_Avoid_: Username, handle, name

## Dissatisfaction

How unhappy a complainant is, recorded as a whole number from 1 to 11.
_Avoid_: Rating, score, severity

## Pending

A complaint that has been submitted but not yet approved. A pending complaint is
visible only to admins.
_Avoid_: Draft, queued, unapproved

## Approved

A complaint an admin has accepted for public display. There is no rejected
state — a complaint that is not approved is deleted.
_Avoid_: Published, live, accepted
