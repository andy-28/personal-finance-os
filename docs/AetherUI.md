# Aether UI

Aether UI is the custom interface language for PersonalFinanceOS. It combines professional finance workflows with the layered feel of a modern MMORPG system interface.

The goal is not to copy game assets. The goal is to make finance workflows feel like usable system windows: dense, readable, and distinctive.

## Design Philosophy

- Desktop-first density, mobile-safe stacking.
- Dark glass panels with restrained cyan highlights.
- Information hierarchy through panels, headers, slots, metrics, and detail panes.
- Game-like structure without sacrificing clarity.
- Shared framework components instead of page-specific styling.

## Management Window

Management windows are the main shell for complex pages such as Credit Cards, Recurring, Categories, Workshop, and System Status.

They usually contain:

- Header
- Toolbar or tabs
- Master list
- Detail panel
- Action bar

## Panel Header

`AetherPanelHeader` is the standard header pattern:

- Eyebrow
- Title
- Subtitle
- Status badge
- Compact summary
- Right-side actions

Header height should stay compact, generally around 52-60px.

## Metric

`AetherMetric` is the standard way to present numbers. It supports tones such as neutral, primary, success, warning, danger, and credit.

Metrics should be used for values such as:

- Net worth
- Assets
- Liabilities
- Outstanding
- Available credit
- Service latency

## Toolbar

`AetherToolbar` is used for filters, tabs, checkboxes, and secondary controls. It keeps spacing and focus behavior consistent.

## Action Bar

`AetherActionBar` is the standard footer/action container for save, cancel, delete, restore, archive, import, and submit actions.

## Game Button

Buttons should keep clear hierarchy:

- Primary for the main action.
- Outline for secondary actions.
- Ghost for low-emphasis actions.
- Danger for destructive actions.

## Game Tabs

Tabs should act like system-window tab controls, not marketing navigation. They should be compact, keyboard reachable, and visually clear.

## Quest Window

The Quest Window turns upcoming finance tasks into a game-style task log. It is a UI/workflow concept today, not a separate domain model.

## Workshop

Workshop is the theme editor and visual settings surface. It currently manages favicon, visual slots, and local effect settings.

## Design Tokens

Colors and spacing should be centralized in global CSS and reusable components. New pages should prefer existing Aether components before adding page-specific CSS.

## Rule of Thumb

If a UI pattern appears on two pages, consider moving it into the Aether UI framework.
