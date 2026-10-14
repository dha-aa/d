# Project guidance

## Project structure

- `index.html` is the portfolio homepage; keep its published URL at the project root.
- `blog/` contains published blog pages. Keep existing page URLs stable.
- `assets/` contains shared static assets such as `favicon.svg`.
- `css/` contains `site.css` and `blog.css`.
- `js/` contains homepage interaction code (`site.js`).
- `scripts/` contains local build/content utilities, including `generate-blog-index.js`.
- `templates/` contains reusable source templates. Do not treat template files as published posts.

## Editing conventions

- Update relative asset paths whenever moving a file; verify that each referenced local file exists from that page's directory.
- Preserve the existing minimal visual style and content unless the user requests a redesign or copy change.
- Keep article video preload settings as authored. Do not change them for performance reasons without explicit user direction.
- When adding a blog post, copy `templates/blog-post.html` into `blog/`, replace its sample content and placeholders, then regenerate the listing.
- The blog index generator owns only the content between `<!-- BLOG_POSTS:START -->` and `<!-- BLOG_POSTS:END -->`. Preserve those markers and surrounding markup.

## Validation

From the project root, run:

```sh
node --check js/site.js
node --check scripts/generate-blog-index.js
node --check scripts/generate-gallery.js
node scripts/generate-blog-index.js
node scripts/generate-gallery.js
git diff --check
```

Also confirm changed HTML files parse and their local CSS, JavaScript, favicon, and page links resolve. The template's `your-image-url.jpg` is an intentional sample placeholder until replaced in a copied post.
