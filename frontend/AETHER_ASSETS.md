# Aether Asset System

The Aether Asset System centralizes semantic visual identity for Coin Engine. Components should use `AetherIcon` or `AetherAsset` instead of hardcoding SVGs, images, or emoji. Future custom artwork can be dropped into `frontend/public/aether` and connected through `frontend/lib/aether/asset-registry.ts`.

## Architecture

```text
Aether Asset System
├── System Icons
├── Resource Icons
├── Object Art
├── Frames / Ornaments
└── Effects
```

## Runtime Components

- `frontend/lib/aether/asset-registry.ts`
- `frontend/components/aether/aether-asset.tsx`

Usage:

```tsx
<AetherIcon name="ledger" size="sm" />
<AetherAsset name="asset-crystal" size="lg" className="aether-resource-icon" />
```

Fallback strategy:

```text
Custom asset src in registry
  -> internal SVG fallback glyph
  -> semantic tone and frame CSS
```

## Public Structure

```text
frontend/public/aether/
├── branding/
├── effects/
├── frames/
├── icons/
│   ├── resources/
│   └── system/
└── objects/
    └── cards/
```

## Asset Manifest

| Key | Category | Usage | Expected Size | Status | Fallback |
| --- | --- | --- | --- | --- | --- |
| account | System | Account navigation and account identity | 16-24 | Fallback | Internal SVG |
| ledger | System | Ledger and transactions | 16-24 | Fallback | Internal SVG |
| credit-card | System | Credit card navigation | 16-24 | Fallback | Internal SVG |
| dashboard | System | Dashboard navigation | 16-24 | Fallback | Internal SVG |
| personal-hud | System | Personal HUD navigation | 16-24 | Fallback | Internal SVG |
| recurring | System | Recurring templates | 16-24 | Fallback | Internal SVG |
| category | System | Taxonomy navigation | 16-24 | Fallback | Internal SVG |
| system-status | System | Health checks | 16-24 | Fallback | Internal SVG |
| workshop | System | Aether Workshop | 16-24 | Fallback | Internal SVG |
| add | System | Create action | 16-24 | Fallback | Internal SVG |
| edit | System | Edit action | 16-24 | Fallback | Internal SVG |
| search | System | Search action | 16-24 | Fallback | Internal SVG |
| filter | System | Filter action | 16-24 | Fallback | Internal SVG |
| calendar | System | Date UI | 16-24 | Fallback | Internal SVG |
| statement | System | Statement workspace | 16-24 | Fallback | Internal SVG |
| installment | System | Installment plans | 16-24 | Fallback | Internal SVG |
| payment | System | Payment action | 16-24 | Fallback | Internal SVG |
| warning | System | Warning state | 16-24 | Fallback | Internal SVG |
| success | System | Success state | 16-24 | Fallback | Internal SVG |
| pending | System | Pending state | 16-24 | Fallback | Internal SVG |
| coin | Resource | Cash and currency | 24-48 | Visual Review | Internal SVG |
| asset-crystal | Resource | Asset totals | 24-48 | Visual Review | Internal SVG |
| debt-shard | Resource | Liability totals | 24-48 | Visual Review | Internal SVG |
| net-worth-core | Resource | Net worth | 24-48 | Visual Review | Internal SVG |
| available-energy | Resource | Available credit | 24-48 | Placeholder | Internal SVG |
| statement-scroll | Resource | Statement import artifact | 24-48 | Placeholder | Internal SVG |
| goal-star | Resource | Goal progress | 24-48 | Placeholder | Internal SVG |
| travel-token | Resource | Travel fund identity | 24-48 | Placeholder | Internal SVG |
| credit-energy | Resource | Credit line identity | 24-48 | Placeholder | Internal SVG |
| wallet | Object | Wallet object art slot | 64-160 | Placeholder | Internal SVG |
| credit-card-richart | Object | Coin Engine Richart card representation | 64-160 | Placeholder | credit-card |
| credit-card-esun | Object | Coin Engine ESUN card representation | 64-160 | Placeholder | credit-card |
| account-vault | Object | Bank account object art slot | 64-160 | Placeholder | account |
| goal-crystal | Object | Goal object art slot | 64-160 | Placeholder | goal-star |

## Artwork Approval Workflow

```text
PLANNED
-> GENERATED
-> INTEGRATED
-> VISUAL REVIEW
-> APPROVED
```

Use `REVISION REQUIRED` for assets that are wired but need art direction or small-size readability changes. P0 assets are currently in `VISUAL REVIEW`; they are not approved yet.

## Phase 2 P0 Runtime Assets

| Key | Category | Status | Runtime File | Dimensions | Format | Transparent | Primary Usage | Fallback | Visual Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coin | Resource | Visual Review | `/aether/icons/resources/coin.webp` | 256x256 | WebP | Yes | Dashboard monthly income / cash resource | Internal SVG | Aged brass financial token with dark steel inset and controlled cyan Aether core. |
| asset-crystal | Resource | Visual Review | `/aether/icons/resources/asset-crystal.webp` | 256x256 | WebP | Yes | Accounts asset total | Internal SVG | Stable emerald/cyan crystal held by a dark steel arcane cradle. |
| debt-shard | Resource | Visual Review | `/aether/icons/resources/debt-shard.webp` | 256x256 | WebP | Yes | Accounts liability total | Internal SVG | Fractured ruby/obsidian liability shard with broken dark steel restraints. |
| net-worth-core | Resource | Visual Review | `/aether/icons/resources/net-worth-core.webp` | 256x256 | WebP | Yes | Accounts net worth | Internal SVG | Amber arcane balance core surrounded by aged brass and dark steel rings. |

Master source images were generated by the built-in image generation workflow and exported into optimized runtime WebP assets. The original generated files are not committed to avoid storing large duplicate source images.

## Artwork Production Queue

P0:

- `coin`: visual review, not approved.
- `asset-crystal`: visual review, not approved.
- `debt-shard`: visual review, not approved.
- `net-worth-core`: visual review, not approved.

P1:

- `statement-scroll`: 48px SVG/WebP, transparent, dark parchment/metal scroll, statement import usage.
- `goal-star`: 48px SVG/WebP, transparent, violet star core, goal bar and HUD usage.
- `wallet`: 96-160px WebP, transparent, dark steel wallet object, account object usage.

P2:

- `credit-card-richart`: 160px WebP/SVG, transparent, cyan card emblem or abstract card face, no bank logo.
- `credit-card-esun`: 160px WebP/SVG, transparent, jade/emerald card emblem or abstract card face, no bank logo.
- `goal-crystal`: 96-160px WebP, transparent, larger violet crystal objective object.

## Replacement Workflow

1. Generate or draw original artwork.
2. Export optimized SVG/WebP with transparent background.
3. Place the asset in `frontend/public/aether/...`.
4. Add `customSrc` to the matching registry entry.
5. UI automatically uses the custom asset through the semantic key.
