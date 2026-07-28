# Coding Guidelines

These guidelines describe project conventions. They are not a replacement for ESLint or compiler checks.

## Naming

- Use domain language consistently: Accounts, Ledger, Credit Cards, Statement Import, Quest, Workshop, Aether.
- Avoid mixing `Cards`, `Credit Card`, and `Credit Cards` in user-facing labels unless the context requires it.
- Prefer explicit names over abbreviations in domain and application code.

## Folder Structure

- Backend domain rules belong in `PersonalFinance.Domain`.
- Application use cases and DTOs belong in `PersonalFinance.Application`.
- Persistence implementation belongs in `PersonalFinance.Infrastructure`.
- HTTP endpoint wiring belongs in `PersonalFinance.Api`.
- Frontend route components belong in `frontend/app`.
- Reusable UI belongs in `frontend/components`.
- Shared client utilities belong in `frontend/lib`.

## React Components

- Keep route pages focused on orchestration.
- Extract repeated UI patterns into shared components.
- Prefer typed props over loosely shaped objects.
- Keep form state local unless it must be shared.

## Hooks

- Keep effects focused on one responsibility.
- Avoid unnecessary network reloads.
- Use shared finance data change events when a mutation should refresh multiple views.

## CSS

- Prefer Aether framework classes and shared components.
- Add page-specific CSS only when the pattern is truly page-specific.
- Avoid large vertical gaps in management windows.
- Keep text from overlapping buttons, badges, or metric cards.

## Aether Components

Use these before creating new page-specific structures:

- `AetherPanelHeader`
- `AetherToolbar`
- `AetherSummaryGrid`
- `AetherMetric`
- `AetherDefinitionList`
- `AetherDefinitionRow`
- `AetherActionBar`
- `AetherEmptyState`

## State Management

The frontend currently uses local React state and API reloads. Do not introduce a global state library unless there is a clear cross-page need.

## API

- Keep API DTOs explicit.
- Do not expose secrets or PDF passwords.
- Prefer review workflows for imported or inferred data.

## Ledger Safety

- Do not write direct balance columns.
- Do not mutate balances outside transactions and entries.
- Forecasts should remain forecasts until explicitly posted.

## Documentation

When adding a major feature, update the relevant doc in `docs/` and consider whether an ADR is needed.
