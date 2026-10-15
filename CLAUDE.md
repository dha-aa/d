# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Project rules (structure, editing conventions, validation commands) live in AGENTS.md and apply here too:

@AGENTS.md

## Overview

Static portfolio site with a blog and photo gallery, deployed on Vercel (dha-aa.vercel.app). No package.json, dependencies, bundler or test suite: pages are hand-written HTML/CSS/vanilla JS, and the two Node scripts in `scripts/` only use `fs`/`path`.

## Commands

- Regenerate blog listings: `node scripts/generate-blog-index.js`
- Regenerate gallery: `node scripts/generate-gallery.js`
- Preview: serve the project root over HTTP (e.g. `python3 -m http.server`). Opening `index.html` from disk breaks inline post loading, which needs `fetch`; it falls back to navigating to the post page.

## How the pieces connect

- **Blog generator** (`generate-blog-index.js`) scans `blog/*.html` (except `index.html`) and pulls metadata with regexes, so posts must keep the template's markup shape: `<title>`, `<div class="blog-meta">DATE</div>` (must parse with `new Date()`; used for newest-first sorting), and `<div class="blog-content">` whose first child is a `<p>` (used as the excerpt). It writes `.blog-post` entries into `blog/index.html` and `.post-card` links with `data-post="<slug>"` into the homepage.
- **Inline reader** (second IIFE block at the end of `js/site.js`) intercepts clicks on `a[data-post]` and `#blog/<slug>` hashes, fetches `blog/<slug>.html`, and imports only `.blog-title`, `.blog-meta` and `.blog-content`. It strips `script`/`style`/`link`/`iframe`/`object`/`embed` and `on*` attributes, rewrites relative `src`/`href` against the post URL, and adds copy buttons to `<pre>` blocks. Post-specific scripts or styles therefore only work on the standalone post page, not inline; anything a post needs inline must be styled by `css/blog.css`.
- **Gallery generator** (`generate-gallery.js`) takes images in `gallery/`, sorts them newest-first by a date parsed from the filename (`IMG_YYYYMMDD`, `YYYY-MM-DD`, `Screenshot_YYYY_MM_DD`, `Videoshot_YYYYMMDD`, `Firefly YYYYMMDD`; others are "Undated" and sort last, by name), and makes `gallery/thumbs/<file>.jpg` previews (900px, via macOS `sips`; skipped when the thumb is newer than the photo; stale thumbs are deleted). Without `sips`, photos lacking a thumb fall back to the full file. Pages use the thumbs with `width`/`height`; the standalone page links each to the full file, and homepage polaroids carry `data-full`, which the lightbox in `js/site.js` loads. Output is deterministic, so a rerun with no new photos produces no diff. Only the newest 9 photos (`HOME_VISIBLE`) go on the homepage.
- **Blog limits:** only the newest 5 posts (`HOME_POSTS`) go on the homepage. `blog/index.html` lists all of them and has a search box (an inline script outside the generator markers; `?q=` pre-fills it).
- **Pre-commit hook** (`.githooks/pre-commit`, needs `git config core.hooksPath .githooks`) runs both generators when staged files touch `gallery/`, `blog/`, `templates/` or `scripts/`, then stages `index.html`, `blog/index.html`, `gallery/index.html` and `gallery/thumbs/`. Note it stages all of `index.html`, including unrelated unstaged edits to it.
- Edit `templates/gallery-template.html`, not `gallery/index.html`, for standalone-gallery markup changes.
