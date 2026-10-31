# Reading Atlas: a library with an address for every book

Status: design and implementation plan only. No application changes or deployment in this planning pass.

This plan uses CTCOV as Context, Task, Constraints, Output and Validation. It is grounded in the existing `3d/catalogue.js`, `3d/app.js`, `3d/world.js`, the original catalogue fixture, and a visual inspection of the live six-storey building.

## C — Context

The building has six real stacked storeys, but each collection currently occupies one rack with 12 mutable book positions. Changing a shelf page replaces the titles in those same positions. This prevents visitors from learning where countries, subjects and individual books belong. Floor names appear in interface controls but lack prominent signs on the building and at its landings.

The original data already supplies 50 country or regional sections for World Fiction, 15 language sections for India, and 22 nonfiction subjects. Those labels and introductions survive in the current catalogue adapter. They should determine the architecture.

The catalogue contains 1,412 collection entries: 300 world fiction, 125 India, 277 nonfiction, 50 science fiction, 250 novellas, 100 rediscovered, 100 contemporary, 50 author paths and 160 short forms. The author paths contain 328 nested reading tasks. Cross-listed works remain separate collection entries; these figures are not a claim of 1,412 unique books.

## T — Task

Create a six-storey literary atlas with a central atrium, continuous stairs, a glass lift, connected galleries, permanent classified shelves and tactile books. Architecture should help visitors understand the collection. Every entry has an address: floor, collection, classification, bay, shelf row and slot.

The arrival view shows all six named floors. Entering takes the visitor to an orientation lobby with an in-world directory. Galleries branch from the lobby, and all remain reachable on foot. The directory also offers immediate travel. A miniature building map and a persistent location trail prevent disorientation.

The ground storey needs at least 65 separately signed country/language compartments and 425 book positions. Its architecture must expand into connected rooms and wings rather than squeeze these into the current small floor plate. Before fixing dimensions, calculate each group's slots, adjacent overflow bays, cabinet partitions, aisle clearance and route length. Small groups may occupy separate labelled compartments in one cabinet. Test the densest floor as a plain geometric model first; size the six-storey shell from that capacity study.

### Floor programme

| Level and proposed visible name | Collection and count | Permanent organisation | Distinctive spatial treatment |
| --- | --- | --- | --- |
| G — The World & Indian Languages | World Fiction 300; India 125 | 50 original country/regional bays in the World wing; 15 language sections in the India wing | Brass map table, walnut galleries, country plaques and language portals |
| 01 — The House of Ideas | Nonfiction 277 | All 22 original subject bays, arranged within five clearly named galleries | Green reading lamps, open study tables and subject lecterns |
| 02 — Other Worlds & Rediscoveries | Science Fiction 50; Rediscovered 100 | Two separate wings, each with chronological shelves; original tags remain searchable | A restrained observatory with a publication timeline; an amber archive with discovery drawers |
| 03 — The Rooms of Short Reading | Novellas 250; Short Forms 160 | Novellas by publication period; separate Essay 50, Poem 50 and Short Story 60 rooms | Intimate reading alcoves, poetry stands, story cabinets and essay tables |
| 04 — The Contemporary Gallery | Contemporary 100 | Original 2000–23 and 2024–26 sections, 50 entries each; year ordering and country-association/genre/award filters | Light stone, gallery plinths and a walkable publication timeline |
| 05 — The Authors’ Observatory | Author paths 50 | Existing era groups, with an individual alcove for every author | Skylight, author nameplates and reading sequences laid out on desks |

### World Fiction and India

Each original country or regional group receives a permanent named bay, its entry count and its original introduction. Large groups receive adjacent numbered bays. Russia's 25 entries, for example, must occupy enough physical shelf space to include all 25. Small groups can share a larger cabinet only when each has a clearly separated, individually labelled compartment.

The default country directory is A–Z. A map provides an additional route to those same shelves. Country-to-map associations are explicit, reviewed configuration. Composite labels such as Palestine and Israel or Scandinavia remain as supplied; a geographic widget does not silently rewrite them or infer an author's nationality.

The India wing uses the existing language classification rather than guessing state or regional assignments: Hindi, English, Bengali, Urdu, Punjabi, Malayalam, Tamil, Kannada, Marathi, Gujarati, Odia, Assamese, Telugu, Konkani and Maithili. The World Fiction India bay and the separate India-language collection remain distinct and clearly signposted.

### Nonfiction subject galleries

The five umbrella galleries below are proposed navigation groupings. Every original subject name, code, introduction and membership stays intact.

| Proposed gallery | Original subjects and entry counts |
| --- | --- |
| Mathematics & Computing — 68 | Mathematics 20; Complexity, Networks & Systems 22; Computer Science & Software 14; AI, ML & Intelligent Systems 12 |
| Nature & the Physical World — 26 | Physics 12; Biology & Evolution 8; Environment/Climate 6 |
| Mind, Language & Philosophy — 46 | Philosophy & Philosophy of Mind 14; Psychology/Cognition 6; Language & Linguistics 10; Non-Dual Philosophy 16 |
| People, History & Power — 85 | Anthropology & Human Variation 18; India—History, Society & State 27; Economics 8; Politics/Sociology 8; History/Geography 8; Global Politics & International Relations 16 |
| Making, Art & Organisations — 52 | Product, Strategy & Organizations 16; Media/Art/Design 8; Writing Craft 8; Sound/Music 10; Architecture/Cities 10 |

A subject lectern displays the existing introduction, complete book count and a route to its shelves. Exact subject labels remain available in search and the accessible directory.

### Floor names and wayfinding

1. Put a large floor number and name on each facade fascia, readable in the initial building view. Add screen-aligned labels in overview so perspective never makes the names unusable.
2. Repeat the name above lift doors, at both stair landings and at the gallery entrance. Every exit sign names its destination.
3. Keep a compact location trail visible: `01 · House of Ideas / Mathematics & Computing / Complexity, Networks & Systems / Bay 1`.
4. Use text and symbols alongside floor accent colours. Names remain legible on mobile and under different lighting.
5. Make the building cutaway selectable. Selecting a storey isolates and labels it; Enter takes the visitor to that floor. Returning to overview restores all six levels.

### Signature interactions

**Find and walk.** Searching a title reveals its exact address. “Show route” traces an unobtrusive path through corridors; “Take me there” travels directly. The destination shelf and book highlight on arrival. Filtering highlights matching books in their permanent locations, while a results list provides quick navigation. It does not reshuffle the home shelves.

**Pick up a book.** Hover or keyboard focus exposes a readable title. Selecting slides the book out, turns it toward the visitor and opens an inspection view. The visitor can rotate it, inspect a matched real cover, read the existing notes and open the original entry. Closing returns it to its original slot. Do not invent full book text, authentic spine artwork or page-count-based thickness when those assets/data are unavailable.

**The Atlas table.** A rotatable tabletop globe/map opens country or regional cards, showing collection counts, the original introduction and a route to the named shelf. The A–Z directory is an equivalent accessible alternative.

**The reading desk.** Visitors can keep a personal stack of selected titles, reorder it and return to each title's physical shelf. Bookmarks save locally with an explicit persistence description. Existing reading progress is integrated only through verified source-ID and storage-key mappings.

**Author journeys.** Each author's alcove contains their existing staged reading guide. The 328 work tasks remain nested under 50 author paths. Selecting a task opens its existing context; it links to a physical book elsewhere only when a matching catalogue entry is established.

**Related shelves.** A “Continue exploring” card links to entries sharing verified metadata and tells the visitor why: same author, exact existing tag, same source subject or publication period. Cross-floor literary routes can be curated from verified records. They do not assert literary influence or shared themes without evidence.

**Optional atmosphere.** An opt-in quiet room ambience and a daylight/evening lighting switch may be added after the core navigation passes validation. Text remains readable in either mode. Reduced-motion mode skips lift rides, animated travel and book flights while preserving all actions.

## C — Constraints

- Preserve every original entry, note, guide, source link and existing saved progress. Do not automatically deduplicate titles across collections.
- Use explicit source classifications first. Science Fiction's 50 distinct tags do not constitute a clean broad-genre taxonomy. Rediscovered tags mix geography and themes. Novellas lack a reliable country field. Use validated publication-period shelves and original-tag filters for these collections; editorial thematic regrouping requires an explicit reviewed mapping.
- Keep compound country/cultural associations intact. Unknown dates or classifications receive visible unclassified/undated placement, not guessed values.
- Allocate physical capacity from group sizes, with stable group IDs and shelf addresses. A source update must not move unrelated shelves; use a versioned layout manifest and adjacent reserved expansion capacity.
- Real cover matches should prefer supplied identifiers, then verified title-author edition references. Label edition variation. Missing or uncertain artwork gets an honest typographic cover; every entry remains usable.
- All six floors and their section entrances form continuous, navigable architecture. Automated travel is optional and never passes visibly through walls.
- Provide equivalent keyboard, touch and accessible list navigation; avoid interactions that require hovering or precision dragging.
- Retain the existing GitHub Pages site and original Atlas. No new hosting or backend is required for the planned core experience.

## O — Output and implementation sequence

### 1. Classification and layout foundation

Create a normalized classification manifest with source group IDs, membership, introductions and explicit derived date bands. Assign persistent catalogue IDs and addresses without changing original storage identifiers. Add a checked-in layout manifest for galleries, bays, rows and slots. Keep original data as the authority and produce a completeness report.

Replace the current fallback identity of `collection:index` with persisted IDs mapped to source provenance and group identity. Store migration aliases for old IDs, detect duplicate source records explicitly, and retain assigned IDs through ordering changes and metadata corrections. Ambiguous identity matches must be reported rather than silently merged. Preserve the original same-origin reading tools when a legacy progress mapping cannot be established safely.

### 2. A complete World/Ideas demonstration

Build the six-floor shell, atrium, lift, stairs and visible signage. Fully implement the ground floor and first floor with all 425 and 277 entries respectively, their actual classifications and permanent bays. Demonstrate a complete walk from lobby to Russia to War and Peace, then a journey to Complexity, Networks & Systems to Thinking in Systems. This is a review milestone within the build, not the final scope.

### 3. Finish every collection

Extend the same shelf/address system to the remaining four floors and give each its stated architecture. Validate that all nine collections and all author tasks remain reachable. Expose all global search results through scrolling or explicit pagination; remove the current inaccessible tail beyond the first 80 matches.

### 4. Book handling and discovery

Add book extraction/inspection, route finding, map selection, the reading desk, deep links and return-to-place behavior. Add author paths and compatible reading progress with round-trip tests before writing any legacy progress keys.

### 5. Visual polish, performance and release verification

Use shared/instanced shelf and book-body geometry, nearby cover textures, distance-based detail and room visibility management. Keep the complete catalogue and spatial manifest available even when distant high-detail objects are unloaded. Prioritize covers for the current shelf and selected book; cancel stale requests and evict unused textures. Bound concurrent cover lookups and ensure browsing never waits for external artwork.

Keep the complete corridor/landing/doorway navigation graph and collision boundaries resident. Stream only room detail: preload the current room and adjacent rooms before a visitor crosses a doorway, using simple geometry until detail is ready. Routes follow traversable doorway and landing nodes, and automated travel pauses if a destination is not ready. Replan when the visitor changes destination; never draw a direct route through walls or unload occupied floor/collision geometry.

Measure startup, frame time, interaction latency and memory on representative desktop and mobile devices. Initial targets are approximately 60 fps desktop and 30 fps mobile, subject to measured hardware capability. Provide automatic lower-detail settings, pause rendering when hidden and handle WebGL/context-loss fallback through the complete catalogue view. Pin and locally package the rendering dependency where practical.

Deliver the implementation branch, a preview demonstrating all six floors, the classification/completeness report and browser verification results before release. Optional atmosphere follows the validated core and is not a substitute for complete classification.

### Suggested code boundaries

- `catalogue.js`: source ingestion and identity preservation.
- `classification.js` plus data manifest: explicit groups, derived periods, provenance and counts.
- `layout.js` plus versioned layout manifest: persistent shelf addresses and walkable connectivity.
- `world.js`: architecture, rendering and room streaming.
- `navigation.js`: routes, movement, lift, minimap and URL state.
- `interactions.js`: book selection, inspection, maps and lecterns.
- `cover-cache.js`: verified artwork lookup, caching and cancellation.
- `progress.js`: saved stack and compatible legacy progress adapter.
- `app.js` and HTML/CSS: accessible controls, search, location trail and fallback.

These boundaries are implementation guidance, not a requirement to add unnecessary files.

## V — Validation

| Check | Acceptance criterion |
| --- | --- |
| Completeness | All nine source counts sum to 1,412 entries; 50 author paths retain all 328 nested tasks. Every source entry has exactly one home address within its collection. |
| Correct classification | All 50 World Fiction groups, 15 India languages and 22 nonfiction subjects match the source membership. Derived groups have explicit rules and no dropped records. |
| Persistent shelves | Revisiting, searching, filtering and changing floors preserve a book's home address. Large groups occupy enough adjacent shelf space; no 12-book replacement rack. |
| Visible names | All six floor names are readable in overview; current floor/section is always apparent inside, including mobile. |
| Physical navigation | Every bay is reachable from its lobby without passing through furniture/walls. Lift and stairs reach all floors and report the correct destination. |
| Specific journeys | Find and inspect War and Peace in Russia; Thinking in Systems in Complexity, Networks & Systems; a title in every other collection; and a task in an author guide. |
| Search | Every match can be reached, including beyond result 80; a result lands at the correct shelf and highlights the correct book. |
| Covers and failure | Matched covers display; missing, slow and failed requests never hide entries or stall navigation. Rapid travel cannot apply a stale cover to a different title. |
| Saved state | Personal stack persists across reload; supported legacy progress reads/writes round-trip without resets or cross-title collisions. |
| Accessibility | Keyboard-only, touch, reduced-motion and non-WebGL catalogue paths expose the same complete collection and actions. |
| Performance | Profiled desktop/mobile runs meet agreed device-specific budgets or activate lower detail; repeated floor changes do not grow texture memory without bound. |

Reference for rendering primitives: the official Three.js documentation lists InstancedMesh, LOD, Raycaster and the relevant camera/control APIs at https://threejs.org/docs/ . The architectural design and performance targets above are proposals to implement and measure, not claims about the current site's measured performance.
