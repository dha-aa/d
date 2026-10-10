# Dhananjay's portfolio

A lightweight static portfolio site with a small blog. The published page URLs remain at the project root and under `blog/`.

Live site: [d-tau-taupe.vercel.app](https://d-tau-taupe.vercel.app)

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

The generator reads article HTML files from `blog/` and replaces only the entries between the `BLOG_POSTS` markers in `blog/index.html`.
