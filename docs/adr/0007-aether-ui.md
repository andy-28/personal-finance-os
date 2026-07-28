# ADR 0007: Aether UI Framework

## Status

Accepted for Sprint 5.3 documentation.

## Context

The project started as a functional finance app and evolved toward a distinct MMORPG-inspired system interface. Page-specific styling created visual drift across Accounts, Credit Cards, Recurring, Categories, Quest Log, Workshop, and System Status.

## Decision

PersonalFinanceOS uses Aether UI as a shared design framework.

Reusable patterns include:

- Management Window
- Panel Header
- Metric
- Toolbar
- Action Bar
- Empty State
- Quest Window
- Workshop visual settings

The UI may reference MMORPG interface language, but it must not copy official game assets, icons, fonts, or sprites.

## Consequences

Future UI work should extend shared Aether components before adding page-specific styles. The product can maintain a distinctive identity while staying readable, professional, and maintainable.
