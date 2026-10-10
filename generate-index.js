const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, 'blog');
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

// Replace the blog-list content
indexContent = indexContent.replace(
  /<div class="blog-list">\s*<\/div>/,
  `<div class="blog-list">${blogListHTML}\n      </div>`
);

// Write back to index.html
fs.writeFileSync(indexPath, indexContent);

console.log(`✅ Generated blog index with ${blogPosts.length} posts`);
