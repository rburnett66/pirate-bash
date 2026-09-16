# PIRATE BASH ship art

Deterministic cutouts from the original 48 supplied JPEGs, plus the replacement mast-free hull, mast sheet and upper sails from the full-ship template. No AI-generated pixels are used in this pack.

Open `review.html` through the local game server to combine hulls, sails and flags, mirror the assembly, preview the x-ray interior, and toggle each mast together with its attached sails and flags. The game now uses this kit in combat, match introductions, Crew and Shipyard. The review page exposes the complete art library; gameplay maps eight hull levels and the six existing sail cosmetics to selected designs.

## Contents

- `hulls/`: 16 exterior designs and one x-ray interior, with original masts/rigging intact. Each has exact left/right PNG variants.
- `bodies/`: the same 17 designs cut at their visible decks for use with the common mast kit, in both directions.
- `masts/`: the original extracted masts plus `revised-*` masts cut from the owner’s `only-mast.png`. The revised set is used in game, in original full-canvas coordinates and both directions.
- `sails/`: 29 transparent set sheets, 87 individual sails, and 58 accompanying pirate flags. `sails/cloth/` contains the two red upper canvases cut from `full-ship-template.JPG`, plus 87 fabric layers cut below the original yards to avoid double crossbars in the common-mast assembly.
- `flags/`: the transparent source sheet and 33 individual flag cutouts. Numbered spatially; emblems and colors remain as supplied.
- `references/`: the assembled ship in `IMG_7253.JPG`, which was supplied in the sails folder, cut out and mirrored as a reference.
- `manifest.json`: source links/checksums, component rectangles, file paths, mast pivots, yard attachment points and flag anchors.

## Preservation and assembly

The 1792 × 1008 source compositions are retained for full hulls, bodies and masts. Component crops use original-resolution pixels plus transparent padding. Mirrored PNGs are exact horizontal reversals, without resampling.

Opaque interiors retain the decoded JPEG RGB values. Only the white background, narrow antialiased boundaries, and neutral ground-shadow matte are processed. White fabric is enclosed before background removal; hull rigging openings use a separate mask. Edge colors are analytically unmatted to prevent a white halo, and the ground shadow is represented as translucent black. No texture is invented or repainted.

The untouched JPEGs remain in `art-review/ship-art-20260914/source/`. Alpha-only masters in the sibling `pixel-masters/` folder retain **all** original RGB pixels, including the background, for later mask adjustments. The earlier AI-assisted sample is not part of this pack.

Mast coordinates and hull mounting points use source-image pixels. The replacement masts stay at their supplied coordinates at scale 1, with no translation. The same transforms stay in place when opening the interior. A mast owns its attached sails and flags; mirroring applies to the whole assembly. The two pole-free flags from each sail sheet attach to the main and fore mast tips; sail fabric attaches to the appropriate yard.

The body cuts preserve the visible deck and short mast/stay feet. Hidden wood behind the original masts is not synthesized. The x-ray hull is its own supplied silhouette, so it is not an exact outline match for every exterior skin; the closed-ship damage view clips it behind the exterior. During crew selection the complete replacement interior appears without the old exterior rim or clipped mast remnants.

## Rebuild

From the project root, run `python scripts/prepare-ship-art.py` with Pillow, NumPy, SciPy and OpenCV installed. The script checks source sizes, original canvas dimensions, unchanged opaque pixels, the five components in every sail set, and exact mirror equality. Source provenance is recorded in the manifest.


## Game integration

`src/ship-art-renderer.js` composites the exterior, supplied interior, three shared masts, cloth and flags. Each mast owns its cloth and flag through damage and falling animation. Canvas artwork uses a uniform source-to-world scale; the existing WebGL renderer supplies battle effects. The complete assembly is mirrored by its ship view.

`src/ship-art-layout.js` maps the existing hull levels and six sail purchases to the artwork. Cosmetic hull variants share a collision footprint derived from the first exterior hull; decorative weapons do not add attacks or statistics. Eight existing sail health zones map onto five visible panels: one aft, two main and two fore. Mast ownership of saved health entries stays unchanged.

Run `python scripts/prepare-revised-ship-art.py`, then `python scripts/build-ship-art-data.py` after rebuilding the original cutouts to regenerate runtime metadata and the canonical hull silhouette, then `npm run build`. Existing version-one battle masks migrate to the new silhouette with each hull section's remaining health fraction preserved; old hole positions are reconstructed within their sections.

Validation: `npm test`, `npm run check`, `node scripts/browser-ship-art.cjs`, `node scripts/browser-hull-mask.cjs`, `node scripts/browser-camera-hold.cjs`, and `node scripts/browser-battle-polish.cjs`.


## Replacement assembly reference

The replacement originals, provenance and verification live in `art-review/ship-art-revision/`. Background removal preserves source pixels inside the artwork and analytically removes the narrow white edge matte. Four new left/right pairs are verified as exact horizontal mirrors. No image synthesis or nonuniform scaling is used.

`full-ship-template.JPG` sets the five-sail/two-flag layout. Crimson uses its two short upper sail cutouts. Other sail styles proportionally shrink their matching cloth into those upper positions; their shapes therefore differ from the red template. All five panels fit their template bounds using a uniform scale, and two flags sit on the main and fore masts. The supplied mast-free interior retains its full silhouette when open. Original assets remain available for reference.
