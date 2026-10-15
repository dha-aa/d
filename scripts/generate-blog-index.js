const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const blogDir = path.join(projectDir, 'blog');
const indexPath = path.join(blogDir, 'index.html');

// Files to exclude
const excludeFiles = ['index.html'];

// Read all files in blog directory
const files = fs.readdirSync(blogDir)
  .filter(file => file.endsWith('.html') && !excludeFiles.includes(file));

// Generate blog post entries
const blogPosts = files.map(file => {
  const filePath = path.join(blogDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract title from <title> tag
  const titleMatch = content.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1] : file.replace('.html', '');

  // Extract date from .blog-meta
  const dateMatch = content.match(/<div class="blog-meta">(.*?)<\/div>/);
  const date = dateMatch ? dateMatch[1] : '';

  // Extract first paragraph as excerpt
  const excerptMatch = content.match(/<div class="blog-content">\s*<p>(.*?)<\/p>/);
  const excerpt = excerptMatch ? excerptMatch[1] : '';

  return {
    file,
    title,
    date,
    excerpt
  };
});

// Sort by date (newest first)
blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Generate the blog list HTML
const blogListHTML = blogPosts.map(post => `
        <div class="blog-post">
          <a href="${post.file}" class="blog-post-title">${post.title}</a>
          <div class="blog-post-meta">${post.date}</div>
          <p class="blog-post-excerpt">${post.excerpt}</p>
        </div>`).join('\n');

// Read the template index.html
let indexContent = fs.readFileSync(indexPath, 'utf-8');

// Replace only the generated entries, preserving the surrounding page markup.
const markers = /<!-- BLOG_POSTS:START -->[\s\S]*?<!-- BLOG_POSTS:END -->/;
if (!markers.test(indexContent)) {
  throw new Error('Blog index is missing BLOG_POSTS markers');
}
indexContent = indexContent.replace(
  markers,
  `<!-- BLOG_POSTS:START -->${blogListHTML}\n        <!-- BLOG_POSTS:END -->`
);

// Write back to index.html
fs.writeFileSync(indexPath, indexContent);

console.log(`✅ Generated blog index with ${blogPosts.length} posts`);

// Also fill the blog section on the homepage (index.html, HOME_BLOG markers).
// Each card links to the post page; on the homepage the script opens the
// post inline instead, and the link is the fallback.
const homePath = path.join(projectDir, 'index.html');
if (fs.existsSync(homePath)) {
  let home = fs.readFileSync(homePath, 'utf-8');
  const homeMarkers = /<!-- HOME_BLOG:START -->[\s\S]*?<!-- HOME_BLOG:END -->/;
  if (!homeMarkers.test(home)) {
    throw new Error('index.html is missing HOME_BLOG markers');
  }
  const cards = blogPosts.map((post, i) => `
        <article class="post-card" style="--r:${i % 2 ? '0.6' : '-0.6'}deg">
          <span class="post-date">${post.date}</span>
          <h3><a class="post-link" href="blog/${post.file}" data-post="${post.file.replace(/\.html$/, '')}">${post.title}</a></h3>
          <p class="post-ex">${post.excerpt}</p>
          <span class="post-go" aria-hidden="true">read →</span>
        </article>`).join('\n');
  home = home.replace(homeMarkers, `<!-- HOME_BLOG:START -->${cards}\n        <!-- HOME_BLOG:END -->`);
  fs.writeFileSync(homePath, home);
  console.log(`✅ Updated homepage blog with ${blogPosts.length} posts`);
}
