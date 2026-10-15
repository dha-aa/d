const fs = require('fs');
const path = require('path');

const galleryDir = path.join(__dirname, '../gallery');
const templatePath = path.join(__dirname, '../templates/gallery-template.html');
const outputPath = path.join(__dirname, '../gallery/index.html');

// Image extensions to include
const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

// Extract date from filename
function extractDate(filename) {
  // Try various date patterns
  const patterns = [
    /IMG_(\d{4})(\d{2})(\d{2})/, // IMG_YYYYMMDD
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /Screenshot_(\d{4})_(\d{2})_(\d{2})/, // Screenshot_YYYY_MM_DD
    /Videoshot_(\d{4})(\d{2})(\d{2})/, // Videoshot_YYYYMMDD
    /Firefly (\d{4})(\d{2})(\d{2})/, // Firefly YYYYMMDD
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      const [, year, month, day] = match;
      return new Date(`${year}-${month}-${day}`);
    }
  }

  // If no date found, return null (will be sorted last)
  return null;
}

// Get year from date
function getYear(date) {
  return date ? date.getFullYear() : null;
}

// Format date for alt text
function formatDate(date) {
  if (!date) return 'Undated';
  const options = { year: 'numeric', month: 'long' };
  return date.toLocaleDateString('en-US', options);
}

// Generate random scattered position with better spacing
function generatePosition(index, total) {
  const row = Math.floor(index / 3);
  const col = index % 3;

  // Grid-based positioning with randomness
  // Each row is about 20% height, each column is about 30% width
  const baseTop = row * 22;
  const baseLeft = col * 32 + 3;

  // Add randomness but keep within bounds
  const top = baseTop + Math.random() * 8 - 2;
  const left = baseLeft + Math.random() * 10 - 3;

  // Smaller rotation for less chaotic look
  const rotation = (Math.random() * 6 - 3).toFixed(1);

  // Consistent width for better spacing
  const width = 22 + Math.random() * 6;

  return {
    top: Math.max(0, top).toFixed(1),
    left: Math.max(0, left).toFixed(1),
    rotation,
    width: width.toFixed(1)
  };
}

// Homepage gallery section: index.html, between the HOME_GALLERY markers.
// Only the first HOME_VISIBLE photos show until "Show all" is pressed.
const homePath = path.join(__dirname, '../index.html');
const HOME_VISIBLE = 9;

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function updateHomepage(images) {
  if (!fs.existsSync(homePath)) return;
  const home = fs.readFileSync(homePath, 'utf8');
  const markers = /<!-- HOME_GALLERY:START -->[\s\S]*?<!-- HOME_GALLERY:END -->/;
  if (!markers.test(home)) {
    throw new Error('index.html is missing HOME_GALLERY markers');
  }

  const items = images.map((file, i) => {
    const label = escapeAttr(formatDate(extractDate(file)));
    const src = escapeAttr('gallery/' + encodeURI(file));
    const tilt = ((((i * 37) % 7) - 3) * 0.8).toFixed(1);
    const more = i >= HOME_VISIBLE ? ' more' : '';
    return `
        <button class="polaroid${more}" type="button" style="--r:${tilt}deg" aria-label="Open photo: ${label}">
          <img src="${src}" alt="${label}" loading="lazy" decoding="async">
          <span>${label}</span>
        </button>`;
  }).join('');

  fs.writeFileSync(homePath, home.replace(markers,
    `<!-- HOME_GALLERY:START -->${items}\n        <!-- HOME_GALLERY:END -->`));
  console.log(`✅ Updated homepage gallery with ${images.length} images`);
}

// Generate gallery HTML
function generateGallery() {
  // Read gallery directory
  const files = fs.readdirSync(galleryDir);

  // Filter image files (exclude .DS_Store and non-images)
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExtensions.includes(ext) && !file.startsWith('.');
  });

  // Sort by date (newest first)
  const sortedImages = imageFiles.sort((a, b) => {
    const dateA = extractDate(a);
    const dateB = extractDate(b);

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateB - dateA;
  });

  // Generate gallery items
  let html = '';
  let lastYear = null;
  let yearAdded = false;

  sortedImages.forEach((file, index) => {
    const date = extractDate(file);
    const year = getYear(date);
    const pos = generatePosition(index, sortedImages.length);

    // Add year label before first image of new year
    if (year && year !== lastYear) {
      const labelPos = generatePosition(index - 0.3, sortedImages.length);
      html += `    <div class="gallery-label" style="top: ${labelPos.top}%; left: ${labelPos.left}%; transform: rotate(${labelPos.rotation}deg);">
      ${year}
    </div>\n`;
      lastYear = year;
    }

    html += `    <div class="gallery-item" style="top: ${pos.top}%; left: ${pos.left}%; width: ${pos.width}%; transform: rotate(${pos.rotation}deg);">
      <img src="${file}" alt="${formatDate(date)}" loading="lazy" decoding="async">
    </div>\n`;
  });

  // Read template
  const template = fs.readFileSync(templatePath, 'utf8');

  // Replace placeholder with generated HTML
  const output = template.replace('<!-- GALLERY_ITEMS -->', html);

  // Write output
  fs.writeFileSync(outputPath, output);

  // Also fill the gallery section on the homepage
  updateHomepage(sortedImages);

  console.log(`✅ Generated gallery with ${sortedImages.length} images`);
}

generateGallery();
