# Dhananjay's portfolio

A lightweight static portfolio site with a small blog. The published page URLs remain at the project root and under `blog/`.

Live site: [dha-aa.vercel.app](dha-aa.vercel.app)

## Project layout

```text
.
├── index.html                 # Portfolio homepage
├── blog/                      # Published blog pages
├── assets/                    # Shared static assets (favicon, images)
├── css/                       # Site and blog stylesheets
├── js/                        # Homepage interactions
├── scripts/                   # Local content/build utilities
└── templates/                 # Reusable source templates (not published posts)
```

## Blog workflow

1. Copy `templates/blog-post.html` into `blog/` and replace its sample title, date, and content.
2. Regenerate the blog listing from the project root:

   ```sh
   node scripts/generate-blog-index.js
   ```

The generator reads article HTML files from `blog/` and replaces only the entries between the `BLOG_POSTS` markers in `blog/index.html`. The homepage shows the newest 5 posts; "See all posts" opens `blog/index.html` in a new tab, where every post is listed and searchable.

## Gallery workflow

Drop photos (`.jpg`, `.png`, `.webp`, `.gif`, `.svg`) into `gallery/`, then run:

```sh
node scripts/generate-gallery.js
```

It makes small previews in `gallery/thumbs/` (with macOS `sips`), sorts photos newest-first by the date in the filename, and updates `gallery/index.html` and the homepage (newest 9 photos; "See all photos" links to the full gallery). Clicking a photo opens the full-size file.

## Automatic updates

Turn on the git hook once per clone:

```sh
git config core.hooksPath .githooks
```

After that, any commit that adds or changes files in `gallery/` or `blog/` reruns both generators and includes their output in the commit.
