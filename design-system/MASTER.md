# DraftLens Design System

## Visual Thesis

DraftLens should feel like a premium public-sector SaaS review system for evidence-sensitive documents: light, spacious, calm, colorful, and trustworthy. The public landing surface uses a bright product-story aesthetic; the authenticated dashboard/report surfaces can keep their darker review-console mood until they are intentionally redesigned.

## Product Principles

- Trust before persuasion: do not present uncertainty as certainty.
- Product proof beats abstract decoration: use claim findings, citation states, traces, and benchmark language as the visible design material.
- Preserve the existing MVP spine: auth, uploads, credits, history, demo mode, and report workflows must remain visually and functionally legible.
- Keep accessibility and contrast ahead of motion or polish.

## Core Tokens

- Marketing background: `#f6fbff` with broad blue, green, and amber gradient fields.
- Marketing foreground: `#142034`.
- Muted text: `#5e6f83`; secondary muted: `#8292a5`.
- Primary blue: `#1a73e8`; strong blue: `#0755c8`.
- Trust green: `#22b58f`; evidence amber: `#ffbf69`.
- Surface: white or translucent white with `rgba(20, 32, 52, 0.10)` borders.
- Radius: `1rem` for small controls, `1.4rem-2rem` for panels, fully rounded for pill CTAs.
- Elevation: soft blue-gray shadows, never heavy black shadows on light pages.

## Typography

- Display: existing serif stack via `--font-display`, used for large hero and section headings.
- UI/body: existing sans stack via `--font-sans`.
- Hero headings should be confident and compact, not over-wide.
- Card headings stay smaller and tighter than hero/section type.
- No negative letter spacing; labels use modest positive tracking only where helpful.

## Components

- Header: sticky rounded light shell, clear brand mark, simple navigation, one auth CTA, mobile menu with 44px+ controls.
- Buttons: primary gradient button for main conversion, white secondary button for lower-pressure navigation.
- Product preview: code-native app mock panels using realistic DraftLens states, not copied screenshots.
- 3D provenance map: use Three.js only for product-native evidence/trace visualization, keep it unframed/full-width, and verify canvas pixels on desktop/mobile.
- Feature cards: one icon family, consistent icon containers, enough text to explain the product primitive.
- Process cards: numbered stages with clear review workflow language.
- Status/proof panels: use real project capabilities and demo mode states; avoid fake customer logos or fabricated metrics.

## Motion

- Use short opacity/translate reveal and hover lift for cards/buttons.
- Respect `prefers-reduced-motion`.
- Do not animate layout dimensions or create scroll-jank.

## Responsive Rules

- Desktop first viewport: hero copy and product preview side by side.
- Tablet/mobile: stack hero, keep CTAs full-width on narrow screens, preserve preview readability.
- Mobile header collapses to a menu; no horizontal scroll, clipped text, or hidden primary action.

## Page Rules

- Public landing page: light premium SaaS storytelling inspired by Healthy Together's spacious large-type public-service tone, without copying assets, copy, or layout.
- Dashboard/report pages: preserve existing darker trust-console design unless a future pass explicitly migrates them to a unified light app shell.
