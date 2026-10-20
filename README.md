# The Reading Atlas

A self-contained, offline-friendly literary discovery library spanning countries, centuries, genres, and ideas. Explore **1,412 entries across nine interactive collections**, with reading notes, filters, saved lists, and progress tracking.

**[Open the live atlas](https://kapil433.github.io/readingatlas/)** · [Download the single-file edition](https://github.com/kapil433/readingatlas/raw/refs/heads/main/index.html)

## Collections

| Collection | Entries |
| --- | ---: |
| World fiction | 300 |
| World nonfiction | 277 |
| India in fiction | 125 |
| Science fiction, chronologically arranged | 50 |
| Novellas and short novels | 250 |
| Overlooked and rediscovered older novels | 100 |
| Contemporary books, 2000–2026 | 100 |
| Authors worth reading deeply, with suggested reading paths | 50 |
| Essays, poems, and short stories | 160 |
| **Total** | **1,412** |

The contemporary shelf includes **50 highlights from 2000–2023** and **50 recent picks from 2024–2026**: 17 from 2024, 18 from 2025, and 15 from 2026. It spans prize recognition, critics’ favourites, translated fiction, popular reads, memoir, and poetry.

The short-form collection contains **50 essays, 50 poems, and 60 short stories**. Counts include author paths and repeat appearances across shelves; they are not a count of unique books.

## Open the atlas offline

1. Download [index.html](index.html) using GitHub's **Download raw file** option.
2. Open it in a modern browser.
3. Switch between the nine tabs and explore at your own pace.

All layouts, scripts, and collection data are embedded in the single HTML file. No installation, build tools, account, or server is required. External source and edition-search links require an internet connection.

## Features

- A top-bar light/dark theme toggle across all nine shelves and deeper author guides. Light is the default; your choice is saved in this browser separately from reading progress and restored on reload. It also works in the downloaded offline edition.
- Nine responsive shelves with search and collection-specific filters for country, period, language, genre, form, or prize.
- Chronological science fiction browsing and 250 compact novels and novellas.
- 100 contemporary selections spanning 2000–2026, with period and reading-route filters, publication or reading-edition years, separate award dates, translator credits, and source links.
- Fifty author paths with **328 individually checkable reading tasks** and a dedicated **Deeper reading guide** in place of the author shelf's old edition-search button.
- Five sections in every author guide: **Reading route**, **Editions & translations**, **Life & context**, **Companions**, and **Criticism**. Guides include a shorter first route, suggested sequence, edition trade-offs, historical influences, biographical starting points, supplementary material, source links, and spoiler cautions.
- Author-card and guide checklists stay synchronized, with per-author and overall progress, incomplete-checklist filtering, and search by recommended book title.
- Essays, poems, and stories grouped by form, country, period, or theme.
- Browser-local saved/read tracking and reading-list backup controls on applicable shelves.
- Keyboard navigation between the main tabs.

Tracking belongs to the browser and origin where the file is opened. Local files and the hosted site have separate browser storage. Collections use their own storage keys and backup formats; use the relevant export controls before changing devices or browsers.

## Using the author guides

Open [50 author reading paths](https://kapil433.github.io/readingatlas/#authors), then select **Deeper reading guide** beside an author. This opens an internal guide view with section tabs, not a separate external website. **Back to authors** (or Escape) returns to the shelf. Guide tabs support arrow keys, Home, and End. Direct guide links also work, for example [Homer](https://kapil433.github.io/readingatlas/#authors/homer).

Check individual titles on either the author card or its guide. The 328 tasks include individual works, specified collections, selections, and labelled optional extensions; some overlap. They are not 328 unique books or additions to the atlas's 1,412 shelf entries. A checklist is complete when all its listed tasks, including optional extensions, are checked; the shorter first route offers a smaller starting goal.

Previous saved paths and old **route completed** marks are retained. An old route-completion mark does **not** automatically mark the new individual books as read. Author checklist progress is separate from read marks on other shelves.

Use **Back up or restore progress** in a guide, or expand **Selection notes, dates, sources & reading-list backup** on the shelf. **Export new-shelves list** downloads `reading-atlas-reading-progress.json`, including individual author-book checks and saved/read marks for the expanded shelves. Import accepts the existing `reading-atlas-expanded-v1` backup format. Import merges supplied entries; an older backup without book-level data preserves existing individual checks. A supplied `false` book value restores that task as unchecked. The earlier collections keep their own backup controls and formats.

Progress is browser-local, not account-synced. Export before clearing browser data or moving to another device. Guide text and checklists remain available offline; external editions, archives, criticism, and companion resources need internet access or a separate legal copy.

Author-guide bibliographic sources were checked on **20 October 2026**. Edition choices are purpose-based recommendations, not a universal ranking of the “best” translation. Compare samples, completeness, notes, and the named translator/editor. Reprints and availability vary. The reading order, context summaries, and discussion questions are original editorial guidance; linked publisher, library, archive, and scholarly resources provide starting points for deeper study.

## Publication years, prizes, and sources

The selections are editorial reading recommendations. Short-novel boundaries vary by edition and translation. Rediscovered works may be available in modern reprints.

The contemporary shelf's year filter uses **original publication or an explicitly identified English-edition year**, rather than prize year. Each entry has one publication or reading-edition year. Original publication, translator credits, and award dates are displayed separately; a recent award does not change a book's publication year. For works published in instalments, the starting year is used and the full span is noted.

A **Nobel Prize in Literature badge identifies an author laureate**, and the accompanying book is a suggested entry point into that author's work. Book-prize winners, shortlists, and longlists are labelled separately. Editorial reading picks do not imply that a linked source ranked a book. Bestseller labels refer to a cited dated chart or publisher claim, rather than a live sales ranking.

The contemporary snapshot was revised on **20 October 2026**. Sources linked inside the atlas include awarding bodies, publishers, library bibliographies, critics, and dated bestseller lists. The offline file does not update automatically.

## Publishing updates with GitHub Pages

This repository publishes from **`main` → `/ (root)`** using **Deploy from a branch** in [Settings → Pages](https://github.com/kapil433/readingatlas/settings/pages). The root `.nojekyll` file keeps the site as plain static files.

To update the live site, replace the root `index.html` on `main` and commit it. If your downloaded file has another name, such as `index-2.html`, publish its contents as `index.html`. Update this README when collection scope, counts, or features change.

GitHub automatically runs its Pages build and deployment process after updates. No custom workflow or self-hosted runner is required. Check [Actions](https://github.com/kapil433/readingatlas/actions) for a successful deployment. If an older page is still cached, hard-refresh the page or open the site with a new query string, such as `?v=20261020`, before the shelf fragment.

## About the content

This is a reading guide with bibliographic entries and original reading notes. It does not include the complete texts of the recommended copyrighted books, essays, poems, or stories.

Curated for Kapil Gupta.

