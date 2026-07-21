---
name: ShipMind Intelligence System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#45464c'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#575e70'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#141b2b'
  on-primary-container: '#7d8497'
  inverse-primary: '#c0c6db'
  secondary: '#006e2f'
  on-secondary: '#ffffff'
  secondary-container: '#6bff8f'
  on-secondary-container: '#007432'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#151c27'
  on-tertiary-container: '#7d8492'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce2f7'
  primary-fixed-dim: '#c0c6db'
  on-primary-fixed: '#141b2b'
  on-primary-fixed-variant: '#404758'
  secondary-fixed: '#6bff8f'
  secondary-fixed-dim: '#4ae176'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#dce2f3'
  tertiary-fixed-dim: '#c0c7d6'
  on-tertiary-fixed: '#151c27'
  on-tertiary-fixed-variant: '#404754'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-xl:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.03em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  section-gap: 120px
  element-gap: 16px
---

## Brand & Style

This design system embodies the "A-round AI startup" aesthetic: a synthesis of **Minimalism** and **Glassmorphism**. It is designed to feel high-end, calm, and intellectually rigorous. The interface prioritizes clarity and breathability, using massive whitespace to reduce the cognitive load of complex logistics data.

The visual narrative is "Predictive Serenity." By leveraging the editorial precision of brands like Linear and Vercel, the UI communicates authority and technological sophistication. Subtle frosted glass effects and thin neutral borders create a sense of layered intelligence, where the most critical information floats atop a clean, organized canvas.

**Key Principles:**
- **Information Hierarchy:** Bold, tight headings for structural clarity.
- **Intentional Contrast:** Deep charcoal text on light grey surfaces for maximum legibility.
- **Confidence Highlights:** Soft, vibrant greens used sparingly to signal AI-verified success and system health.

## Colors

The palette is rooted in a monochromatic scale of "Off-Whites" and "Cool Greys" to establish a premium enterprise feel.

- **Primary:** Deep Charcoal (#111827) used for high-emphasis text and primary actions.
- **Secondary (Accent):** Confidence Green (#22C55E). Used for "AI-Optimized" indicators, success states, and primary CTAs that represent platform "intelligence."
- **Neutrals:** A range of greys from 50 (Surface) to 900 (Text). 
- **Surface:** The main background uses #F9FAFB, while nested containers use #FFFFFF to create a subtle lift.
- **Borders:** A consistent #E5E7EB is used for 1px structural definition.

## Typography

The design system utilizes **Inter** exclusively to achieve a modern, systematic look. The hierarchy relies on extreme contrast between large, tightly-tracked display headings and functional, readable body text.

- **Headings:** Use `font-weight: 600` or `700` with negative `letter-spacing` (tight tracking) to mirror high-end editorial layouts.
- **Body:** Set at 15px or 16px for enterprise density without sacrificing legibility.
- **Labels:** Monospaced-adjacent or small-caps styling can be used for metadata and technical shipping codes to differentiate them from prose.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for data-heavy dashboards, transitioning to a centered **fixed-width grid** for marketing and high-level reporting pages.

- **The "Breathable" Rule:** Use generous vertical spacing (`section-gap`) between distinct content blocks to maintain the premium, calm aesthetic.
- **Data Density:** While marketing pages use large gaps, the SaaS application environment uses a strict 8px/4px base grid for component internal spacing to ensure efficiency.
- **Breakpoints:**
  - **Desktop:** 1200px+ (12 columns, 64px margins).
  - **Tablet:** 768px - 1199px (8 columns, 40px margins).
  - **Mobile:** <767px (4 columns, 20px margins).

## Elevation & Depth

This design system avoids heavy shadows in favor of **Tonal Layering** and **Glassmorphism**.

1.  **Level 0 (Base):** Light grey background (#F9FAFB).
2.  **Level 1 (Cards/Panels):** Pure white (#FFFFFF) with a 1px border (#E5E7EB).
3.  **Level 2 (Overlays/Modals):** Glassmorphism panels. Apply `backdrop-filter: blur(12px)` and a semi-transparent white background `rgba(255, 255, 255, 0.8)`. 
4.  **Shadows:** Use a single "Ambient Shadow" for floating elements: `0 8px 30px rgba(0, 0, 0, 0.04)`. It should be barely perceptible, serving only to separate the element from the layer below.

## Shapes

The shape language is sophisticated and "soft-geometric." 

- **Cards & Primary Containers:** 20px (`rounded-2xl`). This large radius creates a friendly, approachable container for complex data.
- **Interactive Elements:** Buttons, input fields, and dropdowns use a 12px (`rounded-xl`) radius to maintain a professional, tool-like feel.
- **Feedback Tags:** Chips and status indicators use a full pill shape (999px) to distinguish them from actionable buttons.

## Components

### Buttons
- **Primary:** Deep charcoal background, white text, 12px radius. Subtle hover state: slight opacity shift or 1px vertical translation.
- **Secondary:** White background, 1px grey border, 12px radius. 
- **AI-Action:** Confidence green background, white text, used only for "Generate" or "Optimize" actions.

### Input Fields
- 1px neutral border, 12px radius. On focus, the border transitions to charcoal or deep blue with a very subtle 2px outer glow.

### Cards
- 20px radius, white background, 1px border. Padding should be generous (typically 32px) to allow content to breathe.

### Chips & Badges
- Used for shipment status (e.g., "In Transit", "Delivered"). 
- Use low-saturation background tints of the status color with high-saturation text (e.g., Soft Green bg with Deep Green text).

### Navigation
- Vertical sidebar for application state with "active" indicators using a 2px vertical green line or a subtle light-grey pill background.
- Top navigation should be glassmorphic and sticky, blurring the content as it scrolls beneath.