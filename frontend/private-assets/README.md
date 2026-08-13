# Personal / Local Reference Asset Workspace

This folder is for local-only visual research and personal UI experiments.

It is intentionally separated from `frontend/public/aether/`.

## What belongs here

- Personal reference screenshots or icons used only for visual comparison.
- Game-art reference material for studying silhouette, material, lighting, depth, rarity language, and small-size readability.
- Local experiment notes and manifest files.

## What does not belong here

- Coin Engine production artwork.
- Aether original runtime assets.
- Third-party artwork committed to GitHub.
- Assets required by production builds.

## Safety rules

- Do not place third-party reference art in `frontend/public/`.
- Do not import files from this folder into production runtime code.
- Do not commit image binaries from this folder.
- Do not treat reference assets as approved Coin Engine artwork.

Image binaries and `manifest.local.json` are ignored by Git. Use `manifest.example.json` as the shape for local manifests.

## Suggested local structure

```text
frontend/private-assets/
├── manifest.local.json
├── maplestory/
│   ├── icons/
│   ├── items/
│   ├── monsters/
│   ├── ui/
│   └── misc/
└── references/
```

Reference assets are for comparison only:

```text
Aether Original
  -> production-safe runtime artwork

Personal Reference
  -> local-only inspiration / comparison
  -> never approved
  -> never deployed
```
