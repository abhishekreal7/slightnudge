# M0 selection plan — frozen before the landing page implementation

Purpose: check whether SlightNudge identifies the source node that produced a clicked browser element, and whether its safety decision accounts for repeated output. This is a preview-only test: never press **Apply change**. Every preview is discarded immediately.

## Fixed selection set

Select these 30 distinct rendered elements in order and record the visible source path, line, tag, and safety result. A selection is **allowed** only if the editor confirms a source mapping and enables editing. It is **refused** if it explains why the mapping/style cannot safely be edited. Mark **WRONG TARGET** if the reported source location does not contain the clicked element, or if an element rendered from a repeated list/component is offered as a one-instance edit without warning that the source change affects every instance.

| # | Section | Element to click | Required target check |
|---:|---|---|---|
| 1 | Hero | hero section boundary/background | `Hero.tsx`, section opening tag |
| 2 | Hero | eyebrow text | `Hero.tsx`, eyebrow paragraph |
| 3 | Hero | main headline | `Hero.tsx`, heading; its text comes from a prop |
| 4 | Hero | supporting paragraph | `Hero.tsx`, description paragraph; text comes from a prop |
| 5 | Hero | primary CTA | `Hero.tsx`, static anchor |
| 6 | Features | section boundary/background | `Features.tsx`, section opening tag |
| 7 | Features | section heading | `Features.tsx`, heading |
| 8 | Features | feature grid background | `Features.tsx`, grid wrapper |
| 9 | Features | first feature card surface | `Features.tsx`, map template with conditional `cn()` class; expected refusal |
| 10 | Features | first feature title | `Features.tsx`, mapped title; flag one-instance claims as WRONG TARGET |
| 11 | Features | first feature description | `Features.tsx`, mapped description; flag one-instance claims as WRONG TARGET |
| 12 | Pricing | section boundary/background | `Pricing.tsx`, section opening tag |
| 13 | Pricing | pricing heading | `Pricing.tsx`, heading |
| 14 | Pricing | first plan card surface | `Pricing.tsx`, static card wrapper |
| 15 | Pricing | plan name | `Pricing.tsx`, static plan heading |
| 16 | Pricing | monthly price | `Pricing.tsx`, static price text |
| 17 | Pricing | first plan feature row | `Pricing.tsx`, mapped list item; flag one-instance claims as WRONG TARGET |
| 18 | Pricing | secondary CTA button | `Pricing.tsx`, button intentionally has no `className`; expected refusal |
| 19 | Testimonials | section boundary/background | `Testimonials.tsx`, section opening tag |
| 20 | Testimonials | section heading | `Testimonials.tsx`, heading |
| 21 | Testimonials | first quote card surface | `Testimonials.tsx`, mapped card; flag one-instance claims as WRONG TARGET |
| 22 | Testimonials | first quote text | `Testimonials.tsx`, mapped quote; flag one-instance claims as WRONG TARGET |
| 23 | Testimonials | first author name | `Testimonials.tsx`, mapped name; flag one-instance claims as WRONG TARGET |
| 24 | FAQ | section boundary/background | `FAQ.tsx`, section opening tag |
| 25 | FAQ | FAQ heading | `FAQ.tsx`, heading |
| 26 | FAQ | first answer card surface | `FAQ.tsx`, map template with conditional `cn()` class; expected refusal |
| 27 | FAQ | first question | `FAQ.tsx`, mapped question; flag one-instance claims as WRONG TARGET |
| 28 | FAQ | first answer | `FAQ.tsx`, mapped answer; flag one-instance claims as WRONG TARGET |
| 29 | Footer | brand link | `Footer.tsx`, static anchor |
| 30 | Footer | trust badge rendered twice | `Footer.tsx`, shared `TrustBadge` definition; expected refusal or explicit all-instances scope |

## Pass/fail notes

- Do not change this list or its acceptance criteria after seeing editor results.
- No source change is applied. If a preview is needed to determine scope, inspect the diff and visual preview, then Discard it.
- A technically correct component-definition location still counts WRONG TARGET when the UI presents it as changing only one repeated visual instance.
- A prop-backed heading may be allowed for style editing if its class is static, but its text must not be claimed as a literal source edit at that component line.
