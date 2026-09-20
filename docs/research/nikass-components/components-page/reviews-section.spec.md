# ReviewsSection Specification

## Overview

- **Target:** `website/src/components/ReviewsSection.astro`
- **Reference:** user-supplied review-section image
- **Interaction model:** static summary and platform row; existing horizontal auto-scrolling carousel with native expandable review cards

## Layout

- Light `#f3f3f3` section background.
- Desktop intro: two columns inside a `max-width: 1400px` container with `20px` side gutters and `48px` gap.
- Left copy: two-line heading and muted explanatory paragraph.
- Right summary card: white translucent fill, `1px` border, `16px` radius; score `4,8 / 5` with `2 847 отзывов` on the same row, five yellow stars below, and symmetric vertical padding.
- Platform row: three equal cards, `16px` gap, `84px` minimum height; each keeps the mark, platform name, review count, and rating on one line for Wildberries, Ozon, and Яндекс.Маркет.
- Review cards start directly after the platform row; no intermediate heading or filter text.

## Responsive behavior

- At `900px` and below, intro stacks into one column and platform cards become a horizontal scroll row.
- At `520px` and below, intro uses `16px` side gutters, heading is `38px`, and the rating card becomes `180px` tall.

## Invariants

- Reuse `reviews` from `website/src/data/reviews.ts` without changing review text or count.
- Keep `.review-card`, `<details>`, auto-scroll, drag, pause-on-touch, and expand/collapse behavior unchanged.
