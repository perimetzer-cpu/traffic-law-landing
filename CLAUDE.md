# Peri Metzer Solomon Traffic Law Site

## Project purpose

This repository contains the public Hebrew website for attorney Peri Metzer Solomon, focused on traffic law and driver licensing. The production site is `https://www.pms.co.il` and is deployed automatically by Vercel from the `main` branch.

Read this file before making any change. Preserve the approved visual identity and ask before making a change that conflicts with these rules.

## Non-negotiable brand rules

- The site is Hebrew-first and must remain `lang="he"` with `dir="rtl"`.
- Brand name: `פרי מצר סולומון`.
- English brand name: `PERI METZER SOLOMON`.
- Monogram: `PMS`.
- Primary palette: deep navy, warm ivory, restrained gold, and muted gray.
- The style must feel premium, authoritative, calm, precise, and editorial. Avoid flashy gradients, generic startup styling, oversized glass effects, neon colors, and decorative 3D treatments.
- Preserve excellent readability and generous spacing.

## Approved hero section

The desktop hero is intentionally rendered from `assets/images/approved-hero-reference.webp`. It is the exact approved composition with the dark portrait panel, diagonal ivory cut, thin gold edge, PMS logo, Hebrew and English name, headline, road motif, navigation, and calls to action.

Do not recreate, crop, replace, recolor, animate, or redesign the desktop hero without explicit approval from the site owner. The invisible navigation and CTA hit areas in `index.html` are positioned over this image, so coordinate changes must be verified carefully.

Mobile uses a separate responsive composition. It may be refined only if the brand, text hierarchy, portrait integrity, and conversion actions remain intact.

## Images

- `assets/images/approved-hero-reference.webp`: approved desktop hero reference. Treat as locked.
- `assets/images/peri-metzer-solomon-warm.webp`: warm portrait used later on the page and as the mobile portrait source.
- Do not replace local images with temporary or third-party URLs.
- Do not generate a new face or materially alter the attorney's appearance.

## Required content and contact details

- Phone display: `052-882-2044`.
- Telephone link: `tel:0528822044`.
- WhatsApp number: `972528822044`.
- Email: `peri@bettylaw.co.il`.
- Main domain: `https://www.pms.co.il`.
- Keep the legal disclaimer. Do not promise outcomes, guarantees, acquittals, license restoration, or other legal results.
- Do not invent awards, years of experience, testimonials, case results, office addresses, bar credentials, or statistics.

## Technical structure

- Static site deployed by Vercel.
- Main application: `index.html`.
- Deployment configuration: `vercel.json`.
- No build step and no package manager are currently required.
- CSS and JavaScript are intentionally colocated in `index.html` for the current small static site.
- Do not migrate to React, Next.js, a CMS, or another framework unless explicitly requested.

## Working rules

1. Inspect the existing implementation before editing.
2. State a short plan before a visual or structural change.
3. Keep changes focused and reversible.
4. Do not remove existing functionality unless explicitly requested.
5. Maintain keyboard accessibility, useful alternative text, visible focus states, and reduced-motion support.
6. Avoid external runtime dependencies unless they are necessary and approved.
7. Never modify DNS, Vercel domains, GitHub access, or deployment settings as part of a code-only request.

## Verification checklist

Before committing:

- Run `python3 -m http.server 4173` from the repository root.
- Check desktop around 1440 px wide.
- Check mobile around 390 x 844.
- Confirm the approved desktop hero is unchanged and fills its intended aspect ratio.
- Confirm no image URL points to `chatgpt.site` or another temporary host.
- Test the top navigation anchors.
- Test phone, WhatsApp, and email links.
- Submit the contact form and confirm it opens a correctly populated WhatsApp message.
- Check the browser console for errors.
- Ensure no horizontal overflow appears on mobile.

## Git and deployment

- Pull the latest `main` before starting work.
- Prefer one focused change per commit.
- Describe visual changes clearly in the commit message.
- A push to `main` publishes to Vercel production, so verify before pushing.
- For large or uncertain redesigns, use a separate branch and Vercel preview deployment first.

## Recommended first response in Claude Code

After reading this file, summarize the current structure and confirm which files you expect to change. Do not modify the hero or publish anything until the requested scope is clear.
