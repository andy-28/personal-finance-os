# Workshop

Workshop is the personalization surface for the Aether UI system.

## Current Scope

Workshop currently focuses on visual settings:

- Favicon selection
- Visual slots
- Header divider effect
- WebP visual effects
- Local UI preferences

## Visual Slot

Visual slots are named places where optional decorative effects can be enabled or disabled. For example:

- `page.header-divider`

Slots allow effects to be managed from Workshop without scattering page-specific toggles throughout the codebase.

## Favicon

Favicon selection is part of the Aether identity system. It helps the project feel like a personal operating system rather than a generic dashboard.

## Theme

The current theme is Aether: dark, glass-like, cyan-highlighted, and inspired by modern MMORPG system UI language.

## WebP

WebP assets can be used for decorative effects when they have transparent backgrounds and do not interfere with layout, controls, or performance.

Animated WebP should respect reduced-motion preferences where practical.

## LocalStorage

Some Workshop state is currently stored in localStorage. This is acceptable for Sprint 5.2 because the feature is UI-only and does not affect financial truth.

## Future DB Sync

Before cloud deployment or multi-device use, Workshop settings should be moved to a backend-backed preference model.

Possible future model:

```text
user_preferences
  user_id
  namespace
  key
  value_json
  updated_at
```

## Design Rule

Workshop can change the presentation layer, but it should not change financial data or ledger behavior.
