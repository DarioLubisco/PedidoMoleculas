# Design System: Pedido Moleculas (Laboratory Dashboard)

Generated using the **UI-UX Pro Max Skill**.

## Core Visuals

### Color Palette

- **Primary (Action)**: `#2563EB` (Cobalt) - Use for main buttons, focus states, and key icons.
- **Secondary**: `#3B82F6` (Sky Blue) - Use for hover states and secondary highlights.
- **Background (Main)**: `#0F172A` (Slate 900) - Deep, professional dark theme.
- **Surface (Cards)**: `rgba(30, 41, 59, 0.7)` - Glassmorphism with `16px` blur.
- **Text (Primary)**: `#F8FAFC` (Slate 50) - High contrast for labels.
- **Text (Muted)**: `#94A3B8` (Slate 400) - For subtitles and placeholders.

### Typography

- **Primary Font**: [Inter](https://fonts.google.com/specimen/Inter)
- **Scale**:
  - `h1`: 2.5rem, bold, letter-spacing -0.02em.
  - `h2`: 1.25rem, semibold.
  - `body`: 0.875rem (14px), regular.
  - `label`: 0.75rem (12px), semibold.

### Layout & Sizing

- **Grid**: 8px base (Multiple of 8 for margins/padding).
- **Radius**: `16px` (Large), `12px` (Medium), `8px` (Small).
- **Touch Targets**: Minimum `44px` height for all clickable elements.

## Design Rules

### 1. Glassmorphism 2.0

- **Rule**: Never use pure black shadows. Use colored shadows (e.g., `rgba(0, 0, 0, 0.5)` with blue-tinted borders).
- **Rule**: Backdrop filter should be at least `16px` for optimal legibility.

### 2. Micro-interactions

- **Hover**: Transitions should be exactly `200ms ease-out`.
- **Feedback**: Scale buttons by `0.98` on click for tactile feel.

### 3. Accessibility

- All inputs must have an associated `<label>`.
- Contrast ratio must meet WCAG AA (4.5:1).
- Interactive elements must have focus indicators (`focus-visible`).

## Pre-delivery Checklist

- [ ] No emojis as icons.
- [ ] Correct cursor pointers.
- [ ] Smooth transitions on all hover states.
- [ ] Verified contrast for text on glass cards.
- [ ] Responsive behavior maintained.
