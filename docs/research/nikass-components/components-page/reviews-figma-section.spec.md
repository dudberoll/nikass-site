# ReviewsFigmaSection Specification

## Source

- **Figma file:** `работа по маме`
- **Figma page:** `сайт nikass`
- **Figma node:** `1710:674` — `Section - Отзывы клиентов`
- **Target:** `website/src/components/ReviewsFigmaSection.astro`
- **Interaction model:** horizontal review carousel with native expandable review details

## Desktop values from Figma

- Section: `1440px` wide, background `#f3f3f3`, top padding `28px`, bottom padding `48px`.
- Heading: horizontal padding `64px`, color `#333131`, Helvetica Neue Medium `42px`, line height `35.2px`, letter spacing `-0.64px`.
- Link row: top margin `28px`, horizontal padding `30px`, gap `16px`.
- Link: `333×56px`, horizontal padding `24px`, border `1px solid #d5d5d2`, radius `999px`, fill `#ffffffc2`, Helvetica Neue Regular `20px/14px`, centered.
- Card row: top margin `34px`, horizontal padding `30px`, gap `16px`.
- Card: `333px` wide, minimum height `200.39px`, radius `16px`, fill `#ffffffad`.
- Card summary: padding `18px 20px`.
- Rating: stars `#888888`, Helvetica Neue Medium `13px`, letter spacing `1px`; value `#2e2b29`, `16px` Medium.
- Name: `#171916`, Helvetica Neue Regular `22px`, line height `27px`.
- Preview/full text: `#47413d`, Helvetica Neue Regular `15px/21.3px`.
- Action: `#7a5f70`, Helvetica Neue Regular `13px/16px`.

## Content

- Links: `Более 10000 заказов`, `10000 отзывов`, `Все отзывы`.
- Review cards reuse the existing NIKASS review data without changing the copy or count.

## Responsive behavior

- At `900px` and below, links and cards remain horizontal scroll tracks with `20px` side padding.
- At `600px` and below, section padding becomes `24px 0 28px`, heading becomes `28px`, links become `52px` high and `17px` text.
