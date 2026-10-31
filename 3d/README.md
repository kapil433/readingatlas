# Reading Atlas spatial library

Serve the repository root with a static HTTP server, then open `/3d/`. The original `index.html` is the catalogue authority and must remain available at `../index.html`.

The library has six storeys, 115 source-grounded classification groups and 1,412 collection entries. The 50 author paths retain 328 nested reading tasks; these are not counted as additional top-level books. World Fiction uses all 50 original country/regional groups, India uses all 15 language groups, and nonfiction uses all 22 original subjects.

## Navigation

- Use the floor directory, named shelf directory or search to travel directly.
- Drag to look; WASD/arrows walk; Q/E turn; I/K look up/down. Touch controls provide equivalent movement.
- Click a spine or cover to inspect the book. The detail view includes original notes, related entries with explicit reasons, reading progress and a saved reading desk.
- Show route draws an obstacle-aware path. If the destination is on another floor, use the lift; the route continues after arriving.
- The Atlas map opens a rotatable schematic globe with all 50 World Fiction markers, plus an accessible directory for every section. Marker locations are representative, not borders.
- Section notes open the original group introduction. The complete catalogue remains available if WebGL cannot start.

## Data and persistence

`catalogue-manifest.json` stores stable record IDs, group order and book slots. `layout-manifest.json` stores group positions and reserves absent groups' coordinates. Existing entries do not move when source data is reordered or a different group is added or removed. Review diagnostics when source identities or classifications change. Alias corrections should be explicit; do not overwrite stable slots during a regeneration.

Each existing group reserves four 24-book bays. The current largest group occupies 85 slots. An addition beyond the reserved capacity requires a deliberate layout migration; the renderer fails visibly rather than silently dropping entries.

The reading desk has its own versioned localStorage key. Reading completion uses verified original Atlas storage schemas and preserves unrelated fields. Browser storage is local to the site's origin. A preview on another host therefore has separate progress. An already-open legacy Atlas tab may have stale state; refresh it before editing progress concurrently.

Real covers are verified against Open Library metadata. Missing or uncertain matches retain a typographic cover, and matched covers may depict a different edition. The application uses a pinned Three.js module and external cover/font services; failures do not remove catalogue entries.

## Verification

From the repository root with a current Node.js runtime:

```sh
node --test tests/*.test.mjs
```

The tests cover source completeness, exact source-group membership, stable identities under reordering, aliases and duplicate diagnostics, all original reading-progress mappings, malformed/blocked storage preservation, and obstacle-aware routes. The source fixture used locally is deliberately not committed; repository tests read the original root `index.html`.

Implementation browser checks covered desktop and a 390 × 844 viewport, country navigation, physical book selection, subject search, result pagination beyond 80, author guide content, saved desk, globe-to-country travel and cross-floor route continuation. Rendering quality is adjustable; device-specific frame-rate targets have not been certified across a hardware matrix.
